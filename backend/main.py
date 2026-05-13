from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List
import json
import os

app = FastAPI(title="Student Registry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "students.json"

def load_students() -> List[dict]:
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_students(students: List[dict]):
    with open(DB_FILE, "w") as f:
        json.dump(students, f, indent=2)

class StudentIn(BaseModel):
    name: str
    student_class: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("student_class")
    @classmethod
    def class_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Class cannot be empty")
        return v.strip()

class StudentOut(BaseModel):
    id: int
    name: str
    student_class: str

@app.get("/")
def root():
    return {"status": "Student Registry API is running 🎓"}

@app.post("/register")
def register_student(student: StudentIn):
    students = load_students()
    for s in students:
        if s["name"].lower() == student.name.lower() and s["student_class"] == student.student_class:
            raise HTTPException(
                status_code=409,
                detail=f"{student.name} is already registered in {student.student_class}."
            )
    new_student = {
        "id": len(students) + 1,
        "name": student.name,
        "student_class": student.student_class,
    }
    students.append(new_student)
    save_students(students)
    return {"message": f"{student.name} registered successfully in {student.student_class}!", "student": new_student}

@app.get("/students", response_model=List[StudentOut])
def get_all_students():
    return load_students()

@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    students = load_students()
    updated = [s for s in students if s["id"] != student_id]
    if len(updated) == len(students):
        raise HTTPException(status_code=404, detail="Student not found.")
    save_students(updated)
    return {"message": f"Student {student_id} deleted successfully."}