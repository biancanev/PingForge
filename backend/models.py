from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

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