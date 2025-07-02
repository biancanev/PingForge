from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
import uuid
import json
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .auth import verify_password, get_password_hash, create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
from .models import UserCreate, UserLogin, User, Token, SessionCreate, Session

app = FastAPI(title="Webhook Debugger API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host='localhost', port=6379, db=0)
security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_to_session(self, session_id: str, message: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message)
                except:
                    self.active_connections[session_id].remove(connection)

manager = ConnectionManager()

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    email = verify_token(token)
    
    # Get user from Redis
    user_data = redis_client.get(f"user:{email}")
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    user = json.loads(user_data)
    return User(**user)

# Optional authentication (for public webhook endpoints)
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None

# User Registration and Authentication
@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    if redis_client.exists(f"user:{user_data.email}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "hashed_password": hashed_password,
        "created_at": datetime.now().isoformat(),
        "is_active": True
    }
    
    # Store user in Redis
    redis_client.set(f"user:{user_data.email}", json.dumps(user))
    redis_client.set(f"user_id:{user_id}", user_data.email)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Get user from Redis
    stored_user = redis_client.get(f"user:{user_data.email}")
    if not stored_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = json.loads(stored_user)
    
    # Verify password
    if not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Session Management
@app.post("/sessions", response_model=Session)
async def create_session(session_data: SessionCreate, current_user: User = Depends(get_current_user)):
    session_id = str(uuid.uuid4())[:8]
    
    session = {
        "id": session_id,
        "name": session_data.name,
        "description": session_data.description,
        "webhook_url": f"/hooks/{session_id}",
        "created_at": datetime.now().isoformat(),
        "owner_id": current_user.id,
        "request_count": 0,
        "is_active": True
    }
    
    # Store session
    redis_client.set(f"session:{session_id}", json.dumps(session))
    redis_client.sadd(f"user_sessions:{current_user.id}", session_id)
    redis_client.expire(f"session:{session_id}", 86400 * 7)  # 7 days
    
    return Session(**session)

@app.get("/sessions", response_model=List[Session])
async def get_user_sessions(current_user: User = Depends(get_current_user)):
    session_ids = redis_client.smembers(f"user_sessions:{current_user.id}")
    sessions = []
    
    for session_id in session_ids:
        session_data = redis_client.get(f"session:{session_id.decode()}")
        if session_data:
            session = json.loads(session_data)
            # Add request count
            request_count = redis_client.llen(f"requests:{session_id.decode()}")
            session["request_count"] = request_count
            sessions.append(Session(**session))
    
    # Sort by created_at desc
    sessions.sort(key=lambda x: x.created_at, reverse=True)
    return sessions

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    # Check if session exists and user owns it
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = json.loads(session_data)
    if session["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    
    # Delete session and related data
    redis_client.delete(f"session:{session_id}")
    redis_client.delete(f"requests:{session_id}")
    redis_client.delete(f"replays:{session_id}")
    redis_client.srem(f"user_sessions:{current_user.id}", session_id)
    
    return {"message": "Session deleted successfully"}

# Keep existing webhook endpoints but add session ownership verification
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@app.api_route("/hooks/{session_id}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def capture_webhook(session_id: str, request: Request):
    # Verify session exists (but don't require authentication for webhook endpoints)
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    body = await request.body()
    webhook_request = {
        "id": str(uuid.uuid4()),
        "method": request.method,
        "headers": dict(request.headers),
        "body": body.decode() if body else None,
        "query_params": dict(request.query_params),
        "timestamp": datetime.now().isoformat(),
        "ip_address": request.client.host if request.client else "unknown"
    }
    
    # Store in Redis
    redis_client.lpush(f"requests:{session_id}", json.dumps(webhook_request))
    redis_client.expire(f"requests:{session_id}", 86400 * 7)  # 7 days
    
    # Update session request count
    session = json.loads(session_data)
    session["request_count"] = redis_client.llen(f"requests:{session_id}")
    redis_client.set(f"session:{session_id}", json.dumps(session))
    
    # Send real-time update via WebSocket
    await manager.send_to_session(session_id, json.dumps(webhook_request))
    
    return {"status": "captured", "request_id": webhook_request["id"]}

@app.get("/sessions/{session_id}/requests")
async def get_session_requests(session_id: str, current_user: User = Depends(get_current_user)):
    # Verify user owns the session
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = json.loads(session_data)
    if session["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
    
    requests_key = f"requests:{session_id}"
    stored_requests = redis_client.lrange(requests_key, 0, -1)
    
    requests = []
    for req_data in stored_requests:
        requests.append(json.loads(req_data))
    
    return {"requests": requests}

# Keep existing replay endpoints...
# (Add the replay endpoints from before with session ownership verification)

@app.get("/")
async def root():
    return {"message": "Webhook Debugger API is running!"}

# Legacy endpoint for backward compatibility (creates anonymous session)
@app.post("/webhooks")
async def create_legacy_webhook_session():
    session_id = str(uuid.uuid4())[:8]
    
    session_data = {
        "id": session_id,
        "name": f"Anonymous Session {session_id}",
        "description": "Legacy anonymous session",
        "webhook_url": f"/hooks/{session_id}",
        "created_at": datetime.now().isoformat(),
        "owner_id": "anonymous",
        "request_count": 0,
        "is_active": True
    }
    redis_client.setex(f"session:{session_id}", 86400, json.dumps(session_data))
    
    return {
        "session_id": session_id, 
        "webhook_url": f"/hooks/{session_id}"
    }