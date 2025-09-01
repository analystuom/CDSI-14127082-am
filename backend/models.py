from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Literal, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: dict[str, Any]) -> dict[str, Any]:
        field_schema.update(type="string")
        return field_schema

UserRole = Literal["admin", "user"]

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: UserRole = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    username: str
    role: UserRole
    created_at: datetime
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class UserInDB(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    username: str
    hashed_password: str
    role: UserRole = "user"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class ReviewRequest(BaseModel):
    text: str = Field(..., description="Text to analyze for emotions")

class EmotionScore(BaseModel):
    label: str = Field(..., description="Emotion label")
    score: float = Field(..., description="Confidence score for the emotion") 