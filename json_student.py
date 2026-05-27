from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StudentOut(BaseModel):
    id: int
    name: str
    student_class: str
    roll_no: Optional[str] = None
    file_url: Optional[str] = None
    registered_at: Optional[datetime] = None  # ← fixed: accepts datetime from MySQL

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
