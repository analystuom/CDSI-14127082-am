from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from datetime import timedelta
from models import UserCreate, UserLogin, Token, UserResponse, UserInDB
from auth import authenticate_user, create_access_token, create_user, get_current_active_user
from config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=Token)
async def register(user: UserCreate):
    try:
        db_user = await create_user(user.dict())
        
        if ACCESS_TOKEN_EXPIRE_MINUTES is not None:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": db_user.username}, expires_delta=access_token_expires
            )
        else:
            access_token = create_access_token(
                data={"sub": db_user.username}
            )
        
        user_response = UserResponse(
            id=db_user.id,
            email=db_user.email,
            username=db_user.username,
            role=db_user.role,
            created_at=db_user.created_at,
            is_active=db_user.is_active
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user"
        )

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await authenticate_user(user.username, user.password)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if ACCESS_TOKEN_EXPIRE_MINUTES is not None:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user.username}, expires_delta=access_token_expires
        )
    else:
        access_token = create_access_token(
            data={"sub": db_user.username}
        )
    
    user_response = UserResponse(
        id=db_user.id,
        email=db_user.email,
        username=db_user.username,
        role=db_user.role,
        created_at=db_user.created_at,
        is_active=db_user.is_active
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
        created_at=current_user.created_at,
        is_active=current_user.is_active
    ) 