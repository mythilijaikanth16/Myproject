from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import os, json

SECRET_KEY    = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key")
ALGORITHM     = "HS256"
TOKEN_TTL     = int(os.getenv("TOKEN_TTL_MINUTES", 60))
USERS_FILE    = "users.json"
pwd_ctx       = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        users = {"admin": pwd_ctx.hash("admin123")}
        with open(USERS_FILE, "w") as f:
            json.dump(users, f)
        return users
    with open(USERS_FILE) as f:
        return json.load(f)

def save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def make_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except JWTError:
        username = None
    if not username or username not in load_users():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username
