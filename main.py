from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from student_controller import router as student_router
from chatcontroller_service import router as chat_router
from auth_router import router as auth_router
import os
from student_db import init_db

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Student Registry API")
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3012"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(student_router)
app.include_router(chat_router)
app.include_router(auth_router)

@app.get("/")
def root():
    return {"status": "Student Registry API v2 is running 🎓"}
