from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Existing models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str

class SessionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Session(BaseModel):
    id: str
    name: str
    description: Optional[str]
    webhook_url: str
    created_at: datetime
    owner_id: str
    request_count: int = 0
    is_active: bool = True

# New models for Collections and Environments
class EnvironmentVariable(BaseModel):
    key: str
    value: str
    enabled: bool = True

class EnvironmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    variables: List[EnvironmentVariable] = []

class Environment(BaseModel):
    id: str
    name: str
    description: Optional[str]
    variables: List[EnvironmentVariable]
    owner_id: str
    created_at: datetime
    is_active: bool = True

class RequestData(BaseModel):
    method: str
    url: str
    headers: Dict[str, str] = {}
    params: Dict[str, str] = {}
    body: Optional[Dict[str, Any]] = None
    auth: Optional[Dict[str, Any]] = None

class CollectionRequestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    request_data: RequestData

class CollectionRequest(BaseModel):
    id: str
    name: str
    description: Optional[str]
    request_data: RequestData
    created_at: datetime

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    environment_id: Optional[str] = None

class Collection(BaseModel):
    id: str
    name: str
    description: Optional[str]
    requests: List[CollectionRequest] = []
    environment_id: Optional[str]
    owner_id: str
    created_at: datetime
    is_active: bool = True