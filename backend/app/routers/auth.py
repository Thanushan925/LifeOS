
import uuid

import jwt
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.tokens import create_access_token, decode_access_token
from app.database import get_db
from app.models import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_NAME = "lifeos_access_token"


def get_current_user(
    access_token: str | None = Cookie(
        default=None,
        alias=COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
) -> User:
    """Identify the user from their authentication cookie."""

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication session.",
    )

    if not access_token:
        raise credentials_error

    try:
        payload = decode_access_token(access_token)
        subject = payload.get("sub")

        if not isinstance(subject, str):
            raise ValueError("Invalid token subject")

        user_id = uuid.UUID(subject)

    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        raise credentials_error

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise credentials_error

    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    email = str(user_data.email).strip().lower()

    existing_user = db.scalar(
        select(User).where(func.lower(User.email) == email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=hash_password(user_data.password),
        display_name=user_data.display_name.strip(),
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return user


@router.post("/login", response_model=UserResponse)
def login_user(
    login_data: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    email = str(login_data.email).strip().lower()

    user = db.scalar(
        select(User).where(func.lower(User.email) == email)
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(login_data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(str(user.id))

    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )

    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_user(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


@router.get("/me", response_model=UserResponse)
def get_my_account(
    current_user: User = Depends(get_current_user),
):
    return current_user