from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from auth_service import pwd_ctx, make_token, load_users, save_users

router = APIRouter(prefix="/auth", tags=["Auth"])

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RegisterUser(BaseModel):
    username: str
    password: str

@router.post("/register", status_code=201)
def register_user(body: RegisterUser):
    users = load_users()
    if body.username in users:
        raise HTTPException(status_code=409, detail="Username already exists.")
    users[body.username] = pwd_ctx.hash(body.password)
    save_users(users)
    return {"message": f"User '{body.username}' registered successfully."}

@router.post("/login", response_model=Token)
async def login(request: Request):
    try:
        body = await request.json()
    except:
        raise HTTPException(status_code=422, detail="Invalid JSON body")
    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        raise HTTPException(status_code=422, detail="Username and password required")
    users  = load_users()
    hashed = users.get(username)
    if not hashed or not pwd_ctx.verify(password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=make_token(username))

@router.get("/me")
def me(request: Request):
    return {"message": "ok"}
