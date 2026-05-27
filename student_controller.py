from fastapi import APIRouter, Form, File, UploadFile, Depends
from typing import Optional
import os, base64
from json_student import StudentOut, ChatRequest
from auth_service import current_user
from student_service import (
    create_student,
    get_students,
    get_student,
    update_student_service,
    delete_student_service,
)

MIME_MAP = {
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".webp": "image/webp",
    ".pdf":  "application/pdf",
    ".doc":  "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

async def file_to_base64(file) -> str:
    contents = await file.read()
    ext  = os.path.splitext(file.filename)[1].lower()
    mime = MIME_MAP.get(ext, "application/octet-stream")
    b64  = base64.b64encode(contents).decode("utf-8")
    return f"data:{mime};base64,{b64}"

router = APIRouter()

@router.post("/register", response_model=StudentOut, status_code=201)
async def register_student(
    name: str = Form(...),
    student_class: str = Form(...),
    roll_no: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user: str = Depends(current_user),
):
    file_url = None
    if file and file.filename:
        file_url = await file_to_base64(file)
    return create_student(name=name, student_class=student_class, roll_no=roll_no, file_url=file_url)

@router.get("/students")
def list_students(user: str = Depends(current_user)):
    return get_students()

@router.get("/students/{student_id}")
def get_single_student(student_id: int, user: str = Depends(current_user)):
    return get_student(student_id)

@router.put("/students/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    name: Optional[str] = Form(None),
    student_class: Optional[str] = Form(None),
    roll_no: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: str = Depends(current_user),
):
    file_url = None
    if file and file.filename:
        file_url = await file_to_base64(file)
    return update_student_service(student_id=student_id, name=name, student_class=student_class, roll_no=roll_no, file_url=file_url)

@router.delete("/students/{student_id}")
def delete_student(student_id: int, user: str = Depends(current_user)):
    return delete_student_service(student_id)
