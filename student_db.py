from db_connector import get_connection
from fastapi import HTTPException

# ── Create / Init table ────────────────────────────────────────────────────────
def init_db():
    conn = get_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                name          VARCHAR(255)  NOT NULL,
                student_class VARCHAR(100)  NOT NULL,
                roll_no       VARCHAR(50)   NOT NULL,
                file_url      LONGTEXT,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✅ Database initialized.")
    finally:
        cursor.close()
        conn.close()

# ── Load all students ──────────────────────────────────────────────────────────
def load_students() -> list:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM students ORDER BY id ASC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

# ── Store one student ──────────────────────────────────────────────────────────
def store_student(name: str, student_class: str, roll_no: str, file_url: str = None) -> dict:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            INSERT INTO students (name, student_class, roll_no, file_url)
            VALUES (%s, %s, %s, %s)
        """, (name, student_class, roll_no, file_url))
        conn.commit()
        # fetch the newly inserted student
        cursor.execute("SELECT * FROM students WHERE id = %s", (cursor.lastrowid,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

# ── Get single student ─────────────────────────────────────────────────────────
def get_student_by_id(student_id: int) -> dict:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return student
    finally:
        cursor.close()
        conn.close()

# ── Update student ─────────────────────────────────────────────────────────────
def update_student(student_id: int, name: str, student_class: str, roll_no: str, file_url: str = None) -> dict:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        if file_url:
            cursor.execute("""
                UPDATE students
                SET name=%s, student_class=%s, roll_no=%s, file_url=%s
                WHERE id=%s
            """, (name, student_class, roll_no, file_url, student_id))
        else:
            cursor.execute("""
                UPDATE students
                SET name=%s, student_class=%s, roll_no=%s
                WHERE id=%s
            """, (name, student_class, roll_no, student_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

# ── Delete student ─────────────────────────────────────────────────────────────
def delete_student(student_id: int) -> dict:
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        conn.commit()
        return {"message": f"Student '{student['name']}' deleted successfully."}
    finally:
        cursor.close()
        conn.close()
