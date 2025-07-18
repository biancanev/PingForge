from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import redis
import uuid
import json
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import os
import time
import asyncio
from pydantic import BaseModel
import base64

from auth import *
from models import *
from security_scanner import *
from email_service import *
from notification_engine import *

# Structure for running ouI donr security scans
class SecurityScanRequest(BaseModel):
    target_url: str
    method: str = "GET"
    headers: Dict[str, str] = {}
    auth: Optional[Dict[str, Any]] = None

# Helper function for TTL
def get_lifespan_seconds(lifespan: SessionLifespan) -> int:
    """Convert lifespan enum to seconds."""
    lifespans = {
        SessionLifespan.ONE_HOUR: 3600,
        SessionLifespan.TWENTY_FOUR_HOURS: 86400,
        SessionLifespan.SEVEN_DAYS: 86400 * 7,
        SessionLifespan.TWO_WEEKS: 86400 * 14
    }
    return lifespans[lifespan]

def is_request_allowed(session_filters: dict, request: Request) -> bool:
    """Check if request passes session filters."""
    if not session_filters:
        return True
    
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    
    # Check blocked IPs
    if "blocked_ips" in session_filters:
        if client_ip in session_filters["blocked_ips"]:
            return False
    
    # Check allowed IPs (if specified, only these are allowed)
    if "allowed_ips" in session_filters and session_filters["allowed_ips"]:
        if client_ip not in session_filters["allowed_ips"]:
            return False
    
    # Check allowed methods (if specified, only these are allowed)
    if "allowed_methods" in session_filters and session_filters["allowed_methods"]:
        if method not in session_filters["allowed_methods"]:
            return False
    
    return True

app = FastAPI(title="API Testing Suite")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pingforge.onrender.com", "https://pingforge.pages.dev"],
    allow_credentials=False,  # Must be False when using "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_url = os.getenv('UPSTASH_REDIS_URL', 'redis://localhost:6379')

if 'upstash.io' in redis_url:
    # Upstash requires SSL - use rediss:// instead of redis://
    redis_url = redis_url.replace('redis://', 'rediss://')
    redis_client = redis.from_url(redis_url, ssl_cert_reqs=None)
else:
    # Local development
    redis_client = redis.from_url(redis_url)
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

# Notification helper function
async def run_notification_evaluation(notification_engine, session_id: str, webhook_data: dict):
    """Run notification evaluation asynchronously"""
    try:
        notification_engine.evaluate_conditions(session_id, webhook_data)
    except Exception as e:
        print(f"Notification evaluation failed for session {session_id}: {e}")

# Security scanning functionality  
@app.post("/api/security-scan")
async def run_security_scan(
    scan_request: SecurityScanRequest,
    current_user: User = Depends(get_current_user)
):
    """Run automated security scan on target URL"""
    print(f"=== SECURITY SCAN REQUEST ===")
    print(f"Target URL: {scan_request.target_url}")
    print(f"Method: {scan_request.method}")
    print(f"User: {current_user.email}")
    print("=============================")
    
    try:
        # Prepare headers including auth
        headers = scan_request.headers.copy()
        
        if scan_request.auth:
            if scan_request.auth.get("type") == "bearer" and scan_request.auth.get("token"):
                headers["Authorization"] = f"Bearer {scan_request.auth['token']}"
            elif scan_request.auth.get("type") == "basic":
                username = scan_request.auth.get("username", "")
                password = scan_request.auth.get("password", "")
                credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers["Authorization"] = f"Basic {credentials}"
            elif scan_request.auth.get("type") == "api-key":
                key = scan_request.auth.get("key", "")
                value = scan_request.auth.get("value", "")
                if key and value:
                    headers[key] = value
        
        # Create scanner using YOUR implemented security_scanner.py
        scanner = SecurityScanner(
            target_url=scan_request.target_url,
            headers=headers,
            timeout=15
        )
        
        # Run YOUR comprehensive scan
        result = await scanner.run_comprehensive_scan()
        
        print(f"Scan completed: {result.total_findings} findings")
        
        # Store scan result for user
        scan_id = str(uuid.uuid4())
        scan_data = {
            "id": scan_id,
            "user_id": current_user.id,
            "result": asdict(result),
            "created_at": datetime.now().isoformat()
        }
        
        # Convert enum values for JSON serialization
        scan_data_json = json.dumps(scan_data, default=str)
        redis_client.setex(f"security_scan:{scan_id}", 86400 * 7, scan_data_json)
        
        return {
            "scan_id": scan_id,
            "result": asdict(result)
        }
        
    except Exception as e:
        print(f"Security scan error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Security scan failed: {str(e)}")

@app.get("/api/security-scan/{scan_id}")
async def get_security_scan(scan_id: str, current_user: User = Depends(get_current_user)):
    """Retrieve security scan results"""
    scan_data = redis_client.get(f"security_scan:{scan_id}")
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    scan_info = json.loads(scan_data)
    if scan_info["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this scan")
    
    return scan_info["result"]

@app.get("/api/security-scans")
async def list_security_scans(current_user: User = Depends(get_current_user)):
    """List user's security scans"""
    # This would require a more sophisticated storage approach for production
    # For now, we'll return a simple response
    return {"message": "Scan history feature coming soon"}

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

@app.post("/notifications/rules", response_model=NotificationRule)
async def create_notification_rule(
    rule_data: NotificationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new notification rule"""
    
    # Verify user owns the session
    session_data = redis_client.get(f"session:{rule_data.session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = json.loads(session_data)
    if session["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create rule
    rule_id = str(uuid.uuid4())[:8]
    rule = NotificationRule(
        id=rule_id,
        session_id=rule_data.session_id,
        name=rule_data.name,
        condition=rule_data.condition,
        operator=rule_data.operator,
        value=rule_data.value,
        email_recipients=rule_data.email_recipients,
        cooldown_minutes=rule_data.cooldown_minutes,
        created_at=datetime.now().isoformat()
    )
    
    print(f"📝 Created rule object: {rule}")
    
    # Save to Redis
    existing_rules = redis_client.get(f"notification_rules:{rule_data.session_id}")
    rules = json.loads(existing_rules) if existing_rules else []
    print(f"📦 Existing rules count: {len(rules)}")
    
    rules.append(rule.dict())
    print(f"📦 New rules count: {len(rules)}")
    
    # Save to Redis with debug
    redis_key = f"notification_rules:{rule_data.session_id}"
    redis_result = redis_client.set(redis_key, json.dumps(rules))
    print(f"💾 Redis save result: {redis_result}")
    print(f"💾 Redis key: {redis_key}")
    
    # Verify it was saved
    saved_data = redis_client.get(redis_key)
    if saved_data:
        saved_rules = json.loads(saved_data)
        print(f"✅ Verified: {len(saved_rules)} rules saved to Redis")
    else:
        print(f"❌ ERROR: No data found in Redis after save!")
    
    return rule

# Push notification routes
@app.get("/notifications/rules/{session_id}")
async def get_notification_rules(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all notification rules for a session"""
    
    # Verify user owns the session
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = json.loads(session_data)
    if session["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    rules_data = redis_client.get(f"notification_rules:{session_id}")
    if not rules_data:
        return []
    
    return json.loads(rules_data)

@app.delete("/notifications/rules/{rule_id}")
async def delete_notification_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a notification rule"""
    
    # Find and verify ownership
    # Implementation depends on your needs
    
    return {"message": "Rule deleted successfully"}


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
        "is_active": True,
        "lifespan": session_data.lifespan,
        "filters": session_data.filters or {}
    }
    
    # Use dynamic TTL based on lifespan
    ttl_seconds = get_lifespan_seconds(session_data.lifespan)
    
    redis_client.set(f"session:{session_id}", json.dumps(session))
    redis_client.sadd(f"user_sessions:{current_user.id}", session_id)
    redis_client.expire(f"session:{session_id}", ttl_seconds)
    redis_client.expire(f"requests:{session_id}", ttl_seconds)
    
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
    # START TIMING for response_time_ms
    start_time = time.time()
    
    # Verify session exists (but don't require authentication for webhook endpoints)
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Parse session data FIRST
    session = json.loads(session_data)
    
    # GET REAL-TIME REQUEST DATA
    try:
        # Get request body
        body = await request.body()
        try:
            body_text = body.decode('utf-8') if body else ""
        except UnicodeDecodeError:
            body_text = f"<binary data: {len(body)} bytes>"
        
        # Get client IP (handle different deployment scenarios)
        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip() or
            request.headers.get("x-real-ip") or
            (request.client.host if request.client else "unknown")
        )
        
        # Determine status code based on processing result
        status_code = 200  # Default success
        error_message = None
        
        # Apply filters if they exist (your existing filter logic)
        session_filters = session.get("filters", {})
        if session_filters:
            method = request.method
            
            # Check blocked IPs
            if "blocked_ips" in session_filters and session_filters["blocked_ips"]:
                if client_ip in session_filters["blocked_ips"]:
                    status_code = 403
                    error_message = "IP address blocked"
                    # Calculate response time before returning
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    # PREPARE WEBHOOK DATA FOR NOTIFICATIONS
                    webhook_data = {
                        "method": request.method,
                        "ip": client_ip,
                        "headers": dict(request.headers),
                        "body": body_text,
                        "query_params": dict(request.query_params),
                        "status_code": status_code,
                        "response_time_ms": response_time_ms,
                        "timestamp": datetime.now().isoformat(),
                        "session_id": session_id,
                        "error_message": error_message
                    }
                    
                    # EVALUATE NOTIFICATION CONDITIONS
                    notification_engine = NotificationEngine(redis_client, email_service)
                    try:
                        notification_engine.evaluate_conditions(session_id, webhook_data)
                    except Exception as e:
                        print(f"Notification evaluation failed: {e}")
                    
                    return {"status": "filtered", "reason": error_message}
            
            # Check allowed IPs (if specified, only these are allowed)
            if "allowed_ips" in session_filters and session_filters["allowed_ips"]:
                if client_ip not in session_filters["allowed_ips"]:
                    status_code = 403
                    error_message = "IP address not in allowlist"
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    webhook_data = {
                        "method": request.method,
                        "ip": client_ip,
                        "headers": dict(request.headers),
                        "body": body_text,
                        "query_params": dict(request.query_params),
                        "status_code": status_code,
                        "response_time_ms": response_time_ms,
                        "timestamp": datetime.now().isoformat(),
                        "session_id": session_id,
                        "error_message": error_message
                    }
                    
                    notification_engine = NotificationEngine(redis_client, email_service)
                    try:
                        notification_engine.evaluate_conditions(session_id, webhook_data)
                    except Exception as e:
                        print(f"Notification evaluation failed: {e}")
                    
                    return {"status": "filtered", "reason": error_message}
            
            # Check allowed methods (if specified, only these are allowed)
            if "allowed_methods" in session_filters and session_filters["allowed_methods"]:
                if method not in session_filters["allowed_methods"]:
                    status_code = 405
                    error_message = "Method not allowed"
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    webhook_data = {
                        "method": request.method,
                        "ip": client_ip,
                        "headers": dict(request.headers),
                        "body": body_text,
                        "query_params": dict(request.query_params),
                        "status_code": status_code,
                        "response_time_ms": response_time_ms,
                        "timestamp": datetime.now().isoformat(),
                        "session_id": session_id,
                        "error_message": error_message
                    }
                    
                    notification_engine = NotificationEngine(redis_client, email_service)
                    try:
                        notification_engine.evaluate_conditions(session_id, webhook_data)
                    except Exception as e:
                        print(f"Notification evaluation failed: {e}")
                    
                    return {"status": "filtered", "reason": error_message}

    except Exception as e:
        # Handle request processing errors
        status_code = 500
        error_message = f"Request processing error: {str(e)}"
        body_text = ""
        client_ip = "unknown"
    
    # CALCULATE FINAL RESPONSE TIME
    response_time_ms = (time.time() - start_time) * 1000
    
    # PREPARE COMPLETE WEBHOOK DATA FOR NOTIFICATIONS
    webhook_data = {
        "method": request.method,
        "ip": client_ip,
        "headers": dict(request.headers),
        "body": body_text,
        "query_params": dict(request.query_params),
        "status_code": status_code,
        "response_time_ms": round(response_time_ms, 2),
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id,
        "error_message": error_message,
        "user_agent": request.headers.get("user-agent", ""),
        "content_type": request.headers.get("content-type", ""),
        "content_length": len(body_text)
    }
    
    # EVALUATE NOTIFICATION CONDITIONS (Main success path)
    notification_engine = NotificationEngine(redis_client, email_service)
    try:
        # Run notification evaluation asynchronously to not block response
        asyncio.create_task(
            run_notification_evaluation(notification_engine, session_id, webhook_data)
        )
    except Exception as e:
        print(f"Failed to start notification evaluation: {e}")
    
    # YOUR EXISTING REQUEST STORAGE LOGIC
    request_data = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.now().isoformat(),
        "method": request.method,
        "headers": dict(request.headers),
        "body": body_text,
        "ip": client_ip,
        "query_params": dict(request.query_params),
        "status_code": status_code,
        "response_time_ms": round(response_time_ms, 2)
    }
    
    # Store in Redis with expiration
    redis_client.lpush(f"requests:{session_id}", json.dumps(request_data))
    redis_client.expire(f"requests:{session_id}", 3600)  # 1 hour expiration
    
    # Update session stats
    session["request_count"] = session.get("request_count", 0) + 1
    session["last_request"] = datetime.now().isoformat()
    redis_client.set(f"session:{session_id}", json.dumps(session))
    
    # Send real-time update via WebSocket
    await manager.send_to_session(session_id, request_data)
    
    # Return appropriate response
    if status_code >= 400:
        return JSONResponse(
            status_code=status_code,
            content={"status": "error", "message": error_message}
        )
    
    return {"status": "captured", "request_id": request_data["id"]}

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

@app.get("/notifications/rules/{session_id}")
async def get_notification_rules(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all notification rules for a session"""
    # Verify user owns the session
    session_data = redis_client.get(f"session:{session_id}")
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = json.loads(session_data)
    if session["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    rules_data = redis_client.get(f"notification_rules:{session_id}")
    if not rules_data:
        return []
    
    return json.loads(rules_data)

@app.delete("/notifications/rules/{rule_id}")
async def delete_notification_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a notification rule"""
    # Find the rule across all sessions for this user
    user_sessions = redis_client.smembers(f"user_sessions:{current_user.id}")
    
    for session_id in user_sessions:
        session_id = session_id.decode() if isinstance(session_id, bytes) else session_id
        rules_data = redis_client.get(f"notification_rules:{session_id}")
        
        if rules_data:
            rules = json.loads(rules_data)
            original_count = len(rules)
            rules = [rule for rule in rules if rule['id'] != rule_id]
            
            if len(rules) < original_count:
                # Rule was found and removed
                redis_client.set(f"notification_rules:{session_id}", json.dumps(rules))
                return {"message": "Rule deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Rule not found")