from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, PasswordEntry
from auth import hash_password, verify_password, create_access_token
from typing import List
from dependencies import get_current_user
from datetime import datetime, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis
import secrets
import string
import os

app = FastAPI(title="Password Manager API")
security = HTTPBearer()

limiter = Limiter(key_func=get_remote_address, storage_uri=os.getenv("REDIS_URL"))
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    # response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline';"
    return response

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    email: str
    encryption_salt: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    encryption_salt: str

class PasswordCreate(BaseModel):
    title: str
    username: str = ""
    encrypted_password: str
    iv: str
    url: str = ""
    notes: str = ""

class PasswordUpdate(BaseModel):
    title: str = None
    username: str = None
    encrypted_password: str = None
    iv: str | None = None
    url: str = None
    notes: str = None

class PasswordResponse(BaseModel):
    id: int
    title: str
    username: str
    encrypted_password: str
    iv: str
    url: str
    notes: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PasswordGeneratorSettings(BaseModel):
    length: int = 16
    include_uppercase: bool = True
    include_lowercase: bool = True
    include_numbers: bool = True
    include_symbols: bool = True
    exclude_similar: bool = False

@app.get("/")
def read_root():
    return {"message": "Password Manager API"}

@app.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return {"email": user.email, "encryption_salt": user.encryption_salt}

@app.post("/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password, salt = hash_password(user.password)
    encryption_salt = secrets.token_urlsafe(16)

    db_user = User(email=user.email, password_hash=hashed_password, salt=salt, encryption_salt=encryption_salt)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "encryption_salt": encryption_salt}

@app.post("/auth/login", response_model=Token)
@limiter.limit("5/minute")
def login(user: UserLogin, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not verify_password(user.password, db_user.password_hash, db_user.salt):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "encryption_salt": db_user.encryption_salt}

@app.get("/passwords", response_model=List[PasswordResponse])
def get_passwords(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    passwords = db.query(PasswordEntry).filter(
        PasswordEntry.user_id == user.id
    ).all()
    return passwords

@app.post("/passwords", response_model=PasswordResponse)
def create_password(
    password: PasswordCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_password = PasswordEntry(
        user_id=user.id,
        title=password.title,
        username=password.username,
        encrypted_password=password.encrypted_password,
        iv=password.iv,
        url=password.url,
        notes=password.notes
    )
    db.add(db_password)
    db.commit()
    db.refresh(db_password)
    return db_password

@app.put("/passwords/{password_id}", response_model=PasswordResponse)
def update_password(
    password_id: int,
    password_update: PasswordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_password = db.query(PasswordEntry).filter(
        PasswordEntry.id == password_id,
        PasswordEntry.user_id == user.id
    ).first()
    if not db_password:
        raise HTTPException(status_code=404, detail="Password not found")
    
    update_data = password_update.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        for field, value in update_data.items():
            setattr(db_password, field, value)
        db.commit()
        db.refresh(db_password)
    return db_password

@app.delete("/passwords/{password_id}")
def delete_password(
    password_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_password = db.query(PasswordEntry).filter(
        PasswordEntry.id == password_id,
        PasswordEntry.user_id == user.id
    ).first()
    if not db_password:
        raise HTTPException(status_code=404, detail="Password not found")
    
    db.delete(db_password)
    db.commit()
    return {"message": "Password deleted successfully"}

@app.post("/generate-password")
def generate_password(settings: PasswordGeneratorSettings):
    if settings.length < 4 or settings.length > 128:
        raise HTTPException(status_code=400, detail="Length must be between 4 and 128")
    
    characters = ""

    if settings.include_lowercase:
        chars = string.ascii_lowercase
        if settings.exclude_similar:
            chars = chars.replace('l', '').replace('o', '')
        characters += chars
    
    if settings.include_uppercase:
        chars = string.ascii_uppercase
        if settings.exclude_similar:
            chars = chars.replace('I', '').replace('O', '')
        characters += chars
    
    if settings.include_numbers:
        chars = string.digits
        if settings.exclude_similar:
            chars = chars.replace('0', '').replace('1', '')
        characters += chars

    if settings.include_symbols:
        chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        characters += chars

    if not characters:
        raise HTTPException(status_code=400, detail="At least one character must be selected")
    
    password = ''.join(secrets.choice(characters) for _ in range(settings.length))

    if settings.include_lowercase and not any(c in string.ascii_lowercase for c in password):
        password = password[:-1] + secrets.choice(string.ascii_lowercase)
    if settings.include_uppercase and not any(c in string.ascii_uppercase for c in password):
        password = password[:-1] + secrets.choice(string.ascii_uppercase)
    if settings.include_numbers and not any(c in string.digits for c in password):
        password = password[:-1] + secrets.choice(string.digits)
    if settings.include_symbols and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        password = password[:-1] + secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?")
    
    return {"password": password}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)