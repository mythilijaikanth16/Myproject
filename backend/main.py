from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json, os, shutil, uuid
from jose import JWTError, jwt
from passlib.context import CryptContext

# ─── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY   = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key")
ALGORITHM    = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

DB_FILE      = "students.json"
USERS_FILE   = "users.json"
UPLOAD_DIR   = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Student Registry API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ─── Password / JWT helpers ─────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ─── User DB helpers ────────────────────────────────────────────────────────────
def load_users() -> dict:
    if not os.path.exists(USERS_FILE):
        # Seed a default admin account
        default = {"admin": hash_password("admin123")}
        with open(USERS_FILE, "w") as f:
            json.dump(default, f, indent=2)
        return default
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    users = load_users()
    if username not in users:
        raise credentials_exception
    return username

# ─── Student DB helpers ─────────────────────────────────────────────────────────
def load_students() -> List[dict]:
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_students(students: List[dict]):
    with open(DB_FILE, "w") as f:
        json.dump(students, f, indent=2)

def next_id(students: List[dict]) -> int:
    return max((s["id"] for s in students), default=0) + 1

# ─── Schemas ────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class RegisterUser(BaseModel):
    username: str
    password: str

class StudentOut(BaseModel):
    id: int
    name: str
    student_class: str
    roll_no: str
    file_url: Optional[str]
    registered_at: str

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    student_class: Optional[str] = None
    roll_no: Optional[str] = None

# ─── Auth Routes ────────────────────────────────────────────────────────────────
@app.post("/auth/register", summary="Register a new admin user")
def register_user(body: RegisterUser):
    users = load_users()
    if body.username in users:
        raise HTTPException(status_code=409, detail="Username already exists.")
    users[body.username] = hash_password(body.password)
    save_users(users)
    return {"message": f"User '{body.username}' registered successfully."}

@app.post("/auth/login", response_model=Token, summary="Login and get JWT")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    users = load_users()
    stored = users.get(form_data.username)
    if not stored or not verify_password(form_data.password, stored):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": form_data.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me", summary="Get current logged-in user")
def me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}

# ─── Student Routes ─────────────────────────────────────────────────────────────
@app.post("/register", response_model=StudentOut, summary="Register a student")
async def register_student(
    name: str = Form(...),
    student_class: str = Form(...),
    roll_no: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: str = Depends(get_current_user),
):
    name = name.strip()
    student_class = student_class.strip()
    roll_no = roll_no.strip()
    if not name or not student_class or not roll_no:
        raise HTTPException(status_code=422, detail="Name, class, and roll number are required.")

    students = load_students()

    # Duplicate check
    for s in students:
        if s["name"].lower() == name.lower() and s["student_class"] == student_class:
            raise HTTPException(
                status_code=409,
                detail=f"{name} is already registered in {student_class}."
            )
        if s["roll_no"] == roll_no and s["student_class"] == student_class:
            raise HTTPException(
                status_code=409,
                detail=f"Roll number {roll_no} already exists in {student_class}."
            )

    # File upload
    file_url = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, filename)
        with open(dest, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
        file_url = f"/uploads/{filename}"

    new_student = {
        "id": next_id(students),
        "name": name,
        "student_class": student_class,
        "roll_no": roll_no,
        "file_url": file_url,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    students.append(new_student)
    save_students(students)
    return new_student

@app.get("/students", response_model=List[StudentOut], summary="List all students (with search & sort)")
def get_all_students(
    search: Optional[str] = None,
    sort_by: Optional[str] = None,   # "name" | "student_class" | "roll_no" | "registered_at"
    order: Optional[str] = "asc",
    current_user: str = Depends(get_current_user),
):
    students = load_students()

    if search:
        q = search.lower()
        students = [
            s for s in students
            if q in s["name"].lower()
            or q in s["student_class"].lower()
            or q in s["roll_no"].lower()
        ]

    valid_sort_fields = {"name", "student_class", "roll_no", "registered_at"}
    if sort_by and sort_by in valid_sort_fields:
        students = sorted(
            students,
            key=lambda s: s.get(sort_by, ""),
            reverse=(order == "desc"),
        )

    return students

@app.get("/students/{student_id}", response_model=StudentOut, summary="Get one student")
def get_student(student_id: int, current_user: str = Depends(get_current_user)):
    students = load_students()
    for s in students:
        if s["id"] == student_id:
            return s
    raise HTTPException(status_code=404, detail="Student not found.")

@app.put("/students/{student_id}", response_model=StudentOut, summary="Update a student")
def update_student(
    student_id: int,
    body: StudentUpdate,
    current_user: str = Depends(get_current_user),
):
    students = load_students()
    for s in students:
        if s["id"] == student_id:
            if body.name is not None:
                s["name"] = body.name.strip()
            if body.student_class is not None:
                s["student_class"] = body.student_class.strip()
            if body.roll_no is not None:
                s["roll_no"] = body.roll_no.strip()
            save_students(students)
            return s
    raise HTTPException(status_code=404, detail="Student not found.")

@app.delete("/students/{student_id}", summary="Delete a student")
def delete_student(student_id: int, current_user: str = Depends(get_current_user)):
    students = load_students()
    student = next((s for s in students if s["id"] == student_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Remove uploaded file if exists
    if student.get("file_url"):
        file_path = student["file_url"].lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    updated = [s for s in students if s["id"] != student_id]
    save_students(updated)
    return {"message": f"Student {student_id} deleted successfully."}

# ─── Stats Route ────────────────────────────────────────────────────────────────
@app.get("/stats", summary="Registry statistics")
def get_stats(current_user: str = Depends(get_current_user)):
    students = load_students()
    class_counts = {}
    for s in students:
        class_counts[s["student_class"]] = class_counts.get(s["student_class"], 0) + 1

    recent = sorted(students, key=lambda s: s.get("registered_at", ""), reverse=True)[:5]

    return {
        "total_students": len(students),
        "total_classes": len(class_counts),
        "students_per_class": class_counts,
        "with_files": sum(1 for s in students if s.get("file_url")),
        "recent_registrations": recent,
    }

# ─── Health ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Student Registry API v2 is running 🎓"}