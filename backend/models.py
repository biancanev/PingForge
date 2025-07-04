from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

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

class SessionLifespan(str, Enum):
    ONE_HOUR = "1h"
    TWENTY_FOUR_HOURS = "24h"
    SEVEN_DAYS = "7d"
    TWO_WEEKS = "14d"

class SessionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    lifespan: SessionLifespan = SessionLifespan.TWENTY_FOUR_HOURS
    filters: Optional[Dict] = None  # For IP/method filtering

class SessionFilters(BaseModel):
    allowed_ips: Optional[List[str]] = None
    allowed_methods: Optional[List[str]] = None
    blocked_ips: Optional[List[str]] = None

class Session(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    webhook_url: str
    created_at: str
    owner_id: str
    request_count: int = 0
    is_active: bool = True
    lifespan: Optional[SessionLifespan] = SessionLifespan.TWENTY_FOUR_HOURS
    filters: Optional[Dict] = None

class NotificationCondition(str, Enum):
    STATUS_CODE = "status_code"
    METHOD = "method"
    IP_ADDRESS = "ip_address"
    HEADER_CONTAINS = "header_contains"
    BODY_CONTAINS = "body_contains"
    QUERY_PARAM = "query_param"
    RESPONSE_TIME = "response_time"
    RATE_LIMIT = "rate_limit"

class NotificationRule(BaseModel):
    id: str
    session_id: str
    name: str
    condition: NotificationCondition
    operator: str  # "equals", "contains", "greater_than", "less_than", "in_range"
    value: Any  # The value to compare against
    email_recipients: List[str]
    is_active: bool = True
    cooldown_minutes: int = 5  # Prevent spam
    created_at: str
    last_triggered: Optional[str] = None

class NotificationCreate(BaseModel):
    session_id: str
    name: str
    condition: NotificationCondition
    operator: str
    value: Any
    email_recipients: List[str]
    cooldown_minutes: int = 5