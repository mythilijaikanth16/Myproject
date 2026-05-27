import json
import os
from typing import List

DB_FILE = "package.json"

def load_students() -> List[dict]:
    if not os.path.exists(DB_FILE):
        return []

    with open(DB_FILE) as f:
        return json.load(f)

def store_student(student: dict):
    students = load_students()
    students.append(student)
    with open(DB_FILE, "w") as f:
        json.dump(students, f, indent=2)

def save_students(students: List[dict]):
    with open(DB_FILE, "w") as f:
        json.dump(students, f, indent=2)

def next_id(students):
    return max((s["id"] for s in students), default=0) + 1
