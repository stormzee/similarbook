import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------- User ----------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    public_key: Optional[str] = Field(None, max_length=64)  # base64 NaCl public key


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    public_key: Optional[str] = Field(None, max_length=64)


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    display_name: Optional[str]
    bio: Optional[str]
    public_key: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID
    username: str
    display_name: Optional[str]
    public_key: Optional[str]

    model_config = {"from_attributes": True}


# ---------- Auth ----------
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------- Task ----------
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    tags: Optional[str] = Field(None, max_length=500)
    is_public: bool = True


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=5000)
    tags: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    is_completed: Optional[bool] = None


class TaskOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str
    tags: Optional[str]
    is_completed: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserBrief] = None

    model_config = {"from_attributes": True}


class SimilarTask(BaseModel):
    task: TaskOut
    similarity: float


# ---------- Connection ----------
class ConnectionRequest(BaseModel):
    addressee_id: uuid.UUID


class ConnectionAction(BaseModel):
    status: str  # "accepted" | "rejected" | "blocked"


class ConnectionOut(BaseModel):
    id: uuid.UUID
    requester_id: uuid.UUID
    addressee_id: uuid.UUID
    status: str
    created_at: datetime
    requester: Optional[UserBrief] = None
    addressee: Optional[UserBrief] = None

    model_config = {"from_attributes": True}


# ---------- Message ----------
class MessageCreate(BaseModel):
    recipient_id: uuid.UUID
    ciphertext: str = Field(..., min_length=1)  # base64-encoded encrypted payload
    nonce: str = Field(..., min_length=1)        # base64-encoded nonce


class MessageOut(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    ciphertext: str
    nonce: str
    is_read: bool
    created_at: datetime
    sender: Optional[UserBrief] = None

    model_config = {"from_attributes": True}
