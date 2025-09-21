import secrets
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_hex(32)
    hashed = pwd_context.hash(password + salt)
    return hashed, salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    return pwd_context.verify(password + salt, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)