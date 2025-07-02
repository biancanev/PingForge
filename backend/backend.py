from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
import uuid
import json
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from auth import *
from models import *

app = FastAPI(title="Webhook Debugger API")

def is_allowed_origin(origin: str) -> bool:
    allowed_patterns = [
        "http://localhost:3000",
        "https://pingforge.pages.dev",
        "https://pingforge.onrender.com",
    ]
    
    # Allow any *.pingforge.pages.dev subdomain
    if origin and origin.endswith(".pingforge.pages.dev"):
        return True
        
    return origin in allowed_patterns

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.pingforge\.pages\.dev",  # Regex pattern
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

# Environment Management Endpoints
@app.post("/environments", response_model=Environment)
async def create_environment(environment_data: EnvironmentCreate, current_user: User = Depends(get_current_user)):
    env_id = str(uuid.uuid4())
    
    environment = {
        "id": env_id,
        "name": environment_data.name,
        "description": environment_data.description,
        "variables": [var.dict() for var in environment_data.variables],
        "owner_id": current_user.id,
        "created_at": datetime.now().isoformat(),
        "is_active": True
    }
    
    # Store environment
    redis_client.set(f"environment:{env_id}", json.dumps(environment))
    redis_client.sadd(f"user_environments:{current_user.id}", env_id)
    
    return Environment(**environment)

@app.get("/environments", response_model=List[Environment])
async def get_user_environments(current_user: User = Depends(get_current_user)):
    env_ids = redis_client.smembers(f"user_environments:{current_user.id}")
    environments = []
    
    for env_id in env_ids:
        env_data = redis_client.get(f"environment:{env_id.decode()}")
        if env_data:
            environments.append(Environment(**json.loads(env_data)))
    
    return sorted(environments, key=lambda x: x.created_at, reverse=True)

@app.put("/environments/{env_id}", response_model=Environment)
async def update_environment(env_id: str, environment_data: EnvironmentCreate, current_user: User = Depends(get_current_user)):
    # Check if environment exists and user owns it
    env_data = redis_client.get(f"environment:{env_id}")
    if not env_data:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    environment = json.loads(env_data)
    if environment["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this environment")
    
    # Update environment
    environment.update({
        "name": environment_data.name,
        "description": environment_data.description,
        "variables": [var.dict() for var in environment_data.variables]
    })
    
    redis_client.set(f"environment:{env_id}", json.dumps(environment))
    return Environment(**environment)

@app.delete("/environments/{env_id}")
async def delete_environment(env_id: str, current_user: User = Depends(get_current_user)):
    # Check if environment exists and user owns it
    env_data = redis_client.get(f"environment:{env_id}")
    if not env_data:
        raise HTTPException(status_code=404, detail="Environment not found")
    
    environment = json.loads(env_data)
    if environment["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this environment")
    
    # Delete environment
    redis_client.delete(f"environment:{env_id}")
    redis_client.srem(f"user_environments:{current_user.id}", env_id)
    
    return {"message": "Environment deleted successfully"}

# Collection Management Endpoints
@app.post("/collections", response_model=Collection)
async def create_collection(collection_data: CollectionCreate, current_user: User = Depends(get_current_user)):
    collection_id = str(uuid.uuid4())
    
    collection = {
        "id": collection_id,
        "name": collection_data.name,
        "description": collection_data.description,
        "requests": [],
        "environment_id": collection_data.environment_id,
        "owner_id": current_user.id,
        "created_at": datetime.now().isoformat(),
        "is_active": True
    }
    
    # Store collection
    redis_client.set(f"collection:{collection_id}", json.dumps(collection))
    redis_client.sadd(f"user_collections:{current_user.id}", collection_id)
    
    return Collection(**collection)

@app.get("/collections", response_model=List[Collection])
async def get_user_collections(current_user: User = Depends(get_current_user)):
    collection_ids = redis_client.smembers(f"user_collections:{current_user.id}")
    collections = []
    
    for collection_id in collection_ids:
        collection_data = redis_client.get(f"collection:{collection_id.decode()}")
        if collection_data:
            collections.append(Collection(**json.loads(collection_data)))
    
    return sorted(collections, key=lambda x: x.created_at, reverse=True)

@app.get("/collections/{collection_id}", response_model=Collection)
async def get_collection(collection_id: str, current_user: User = Depends(get_current_user)):
    collection_data = redis_client.get(f"collection:{collection_id}")
    if not collection_data:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection = json.loads(collection_data)
    if collection["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this collection")
    
    return Collection(**collection)

@app.post("/collections/{collection_id}/requests", response_model=CollectionRequest)
async def add_request_to_collection(collection_id: str, request_data: CollectionRequestCreate, current_user: User = Depends(get_current_user)):
    # Check if collection exists and user owns it
    collection_data = redis_client.get(f"collection:{collection_id}")
    if not collection_data:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection = json.loads(collection_data)
    if collection["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this collection")
    
    # Create new request
    request_id = str(uuid.uuid4())
    new_request = {
        "id": request_id,
        "name": request_data.name,
        "description": request_data.description,
        "request_data": request_data.request_data.dict(),
        "created_at": datetime.now().isoformat()
    }
    
    # Add request to collection
    collection["requests"].append(new_request)
    redis_client.set(f"collection:{collection_id}", json.dumps(collection))
    
    return CollectionRequest(**new_request)

@app.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, current_user: User = Depends(get_current_user)):
    # Check if collection exists and user owns it
    collection_data = redis_client.get(f"collection:{collection_id}")
    if not collection_data:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection = json.loads(collection_data)
    if collection["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this collection")
    
    # Delete collection
    redis_client.delete(f"collection:{collection_id}")
    redis_client.srem(f"user_collections:{current_user.id}", collection_id)
    
    return {"message": "Collection deleted successfully"}

# Execute request with environment variables
@app.post("/collections/{collection_id}/requests/{request_id}/execute")
async def execute_collection_request(
    collection_id: str, 
    request_id: str, 
    current_user: User = Depends(get_current_user)
):
    # Get collection
    collection_data = redis_client.get(f"collection:{collection_id}")
    if not collection_data:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    collection = json.loads(collection_data)
    if collection["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this collection")
    
    # Find request
    request = None
    for req in collection["requests"]:
        if req["id"] == request_id:
            request = req
            break
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found in collection")
    
    # Get environment variables if environment is set
    variables = {}
    if collection.get("environment_id"):
        env_data = redis_client.get(f"environment:{collection['environment_id']}")
        if env_data:
            environment = json.loads(env_data)
            for var in environment["variables"]:
                if var["enabled"]:
                    variables[var["key"]] = var["value"]
    
    # Replace variables in request
    request_data = request["request_data"].copy()
    
    # Replace variables in URL
    url = request_data["url"]
    for key, value in variables.items():
        url = url.replace(f"{{{{{key}}}}}", value)
    
    # Replace variables in headers
    headers = {}
    for header_key, header_value in request_data.get("headers", {}).items():
        for var_key, var_value in variables.items():
            header_value = header_value.replace(f"{{{{{var_key}}}}}", var_value)
        headers[header_key] = header_value
    
    try:
        # Execute the request using httpx
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request_data["method"],
                url=url,
                headers=headers,
                params=request_data.get("params", {}),
                json=request_data.get("body") if request_data.get("body") else None,
                timeout=30.0
            )
            
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
                "request_url": str(response.url),
                "execution_time": response.elapsed.total_seconds() if hasattr(response, 'elapsed') else 0
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request execution failed: {str(e)}")