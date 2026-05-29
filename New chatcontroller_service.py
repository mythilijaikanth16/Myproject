import random
from fastapi import APIRouter, Depends
from json_student import ChatRequest
from auth_service import current_user
from student_service import get_students
from db_connector import save_chat_memory, get_chat_memory

INTENT_REPLIES = {
    "register": ["Go to Register tab and fill student details."],
    "delete":   ["Click delete icon near the student."],
    "edit":     ["Click edit icon to update student details."],
    "search":   ["Use the search bar to find students."],
    #"file":     ["You can upload PDF, DOC, DOCX or image files."],
    "logout":   ["Click Sign out button."],
    "greet":    ["Hello! I'm Regs chatbot."],
}

INTENT_KEYS = {
    "register": ["register", "add student", "new student", "enroll"],
    "delete":   ["delete", "remove", "erase"],
    "edit":     ["edit", "update", "modify"],
    "search":   ["search", "find", "locate"],
    #"file":     ["file", "upload", "document", "pdf"],
    "logout":   ["logout", "sign out"],
    "greet":    ["hi", "hello", "hey"],
}

FALLBACKS = [
    "I didn't understand",
    "Please rephrase your question"
]


def bot_reply(message: str, students: list[dict], user: str = ""):
    m = message.lower()

    if any(k in m for k in ["how many", "count", "total"]):
        return f"Total students: {len(students)}"

    if any(k in m for k in ["ascending", "a to z", "a-z"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s["name"])
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_students))
        return f"Students A to Z:\n\n{lines}"

    if any(k in m for k in ["descending", "z to a", "z-a"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s["name"], reverse=True)
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_students))
        return f"Students Z to A:\n\n{lines}"

    if any(k in m for k in ["class wise", "classwise", "sort by class", "group by class"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s.get("student_class", "").lower())
        lines = "\n".join(
            f"{i+1}. {s['name']} - {s.get('student_class', '')} ({s.get('roll_no', '')})"
            for i, s in enumerate(sorted_students)
        )
        return f"Students sorted by class:\n\n{lines}"

    if any(k in m for k in ["class", "section", "who is in", "students in", "show class", "list class"]):
       words = m.split()
       cls_name = words[-1].lower()
       filtered = [s for s in students if s.get("student_class", "").lower() == cls_name]
       if filtered:
         lines = "\n".join(f"{i+1}. {s['name']} ({s.get('roll_no', '')})" for i, s in enumerate(filtered))
         reply = f"Students in class {cls_name.upper()}:\n\n{lines}"
       else:
        reply = f"No students found in class '{cls_name.upper()}'."
       #save_chat_memory(user, message, reply)
       return reply
    if "roll" in m:
        words = m.split()
        roll = words[-1].lower()
        student = next((s for s in students if str(s.get("roll_no", "")).lower() == roll), None)
        if student:
            return (
                f"Student Found\n\n"
                f"Name: {student['name']}\n"
                f"Roll: {student['roll_no']}\n"
                f"Class: {student['student_class']}"
            )
        return f"No student found with roll number '{roll}'."

    if any(k in m for k in ["file", "files", "uploaded", "file upload"]):
        with_file = [s for s in students if s.get('file_url')]
        without_file = [s for s in students if not s.get('file_url')]
        if not students:
            reply = "No students registered yet."
        elif not with_file:
            reply = "No students have uploaded files yet."
        else:
            names = "\n".join(f"{i+1}. {s['name']} ({s.get('roll_no','')})" for i, s in enumerate(with_file))
            reply = (
                f"Students with uploaded files: {len(with_file)} out of {len(students)}\n\n"
                f"{names}\n\n"
                f"Students without files: {len(without_file)}"
            )
        save_chat_memory(user, message, reply)
        return reply

    # ── how many AFTER file check ──────────────────────────────────────────
    if any(k in m for k in ["how many", "count", "total"]):
        reply = f"Total students: {len(students)}"
        save_chat_memory(user, message, reply)
        return reply


    # ── Then how many ─────────────────────────────────────────────────────────
    if any(k in m for k in ["how many", "count", "total"]):
        reply = f"Total students: {len(students)}"
        save_chat_memory(user, message, reply)
        return reply

 

    for prefix in ["find ", "search ", "show "]:
        if m.startswith(prefix):
            query = m[len(prefix):].strip()
            found = [s for s in students if query in s["name"].lower()]
            if found:
                lines = "\n".join(f"{i+1}. {s['name']} - {s['student_class']}" for i, s in enumerate(found))
                return f"Found:\n\n{lines}"
            return f"No students found matching '{query}'."

    for intent, keywords in INTENT_KEYS.items():
        if any(k in m for k in keywords):
            return random.choice(INTENT_REPLIES[intent])

    return random.choice(FALLBACKS)


def bot_reply_new(message: str, students: list[dict], user: str = ""):
    m = message.lower()

    if any(k in m for k in ["how many", "count", "total"]):
        reply = f"Total students: {len(students)}"
        save_chat_memory(user, message, reply)
        return reply

    if any(k in m for k in ["ascending", "a to z", "a-z"]):
        if not students:
            return "No students found."
        sorted_s = sorted(students, key=lambda s: s["name"])
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_s))
        reply = f"Students A to Z:\n\n{lines}"
        save_chat_memory(user, message, reply)
        return reply

    if any(k in m for k in ["descending", "z to a", "z-a"]):
        if not students:
            return "No students found."
        sorted_s = sorted(students, key=lambda s: s["name"], reverse=True)
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_s))
        reply = f"Students Z to A:\n\n{lines}"
        save_chat_memory(user, message, reply)
        return reply

    if any(k in m for k in ["class wise", "classwise", "sort by class", "group by class"]):
        if not students:
            return "No students found."
        sorted_s = sorted(students, key=lambda s: s.get("student_class", "").lower())
        lines = "\n".join(
            f"{i+1}. {s['name']} - {s.get('student_class', '')} ({s.get('roll_no', '')})"
            for i, s in enumerate(sorted_s)
        )
        reply = f"Students sorted by class:\n\n{lines}"
        save_chat_memory(user, message, reply)
        return reply

    if any(k in m for k in ["class", "section", "who is in", "students in", "show class", "list class"]):
       words = m.split()
       cls_name = words[-1].lower()
       filtered = [s for s in students if s.get("student_class", "").lower() == cls_name]
       if filtered:
          lines = "\n".join(f"{i+1}. {s['name']} ({s.get('roll_no', '')})" for i, s in enumerate(filtered))
          reply = f"Students in class {cls_name.upper()}:\n\n{lines}"
       else:
          reply = f"No students found in class '{cls_name.upper()}'."
       save_chat_memory(user, message, reply)
       return reply
    if "roll" in m:
        words = m.split()
        roll = words[-1].lower()
        student = next((s for s in students if str(s.get("roll_no", "")).lower() == roll), None)
        if student:
            reply = (
                f"Student Found\n\n"
                f"Name: {student['name']}\n"
                f"Roll: {student['roll_no']}\n"
                f"Class: {student['student_class']}"
            )
        else:
            reply = f"No student found with roll number '{roll}'."
        save_chat_memory(user, message, reply)
        return reply

    if any(k in m for k in ["file", "files", "uploaded", "file upload"]):
        with_file = [s for s in students if s.get('file_url')]
        without_file = [s for s in students if not s.get('file_url')]
        if not students:
            reply = "No students registered yet."
        elif not with_file:
            reply = "No students have uploaded files yet."
        else:
            names = "\n".join(f"{i+1}. {s['name']} ({s.get('roll_no','')})" for i, s in enumerate(with_file))
            reply = (
                f"Students with uploaded files: {len(with_file)} out of {len(students)}\n\n"
                f"{names}\n\n"
                f"Students without files: {len(without_file)}"
            )
        save_chat_memory(user, message, reply)
        return reply

    # ── how many AFTER file check ──────────────────────────────────────────
    if any(k in m for k in ["how many", "count", "total"]):
        reply = f"Total students: {len(students)}"
        save_chat_memory(user, message, reply)
        return reply


    for prefix in ["find ", "search ", "show "]:
        if m.startswith(prefix):
            query = m[len(prefix):].strip()
            found = [s for s in students if query in s["name"].lower()]
            if found:
                lines = "\n".join(f"{i+1}. {s['name']} - {s['student_class']}" for i, s in enumerate(found))
                reply = f"Found:\n\n{lines}"
            else:
                reply = f"No students found matching '{query}'."
            save_chat_memory(user, message, reply)
            return reply

    for intent, keywords in INTENT_KEYS.items():
        if any(k in m for k in keywords):
            reply = random.choice(INTENT_REPLIES[intent])
            save_chat_memory(user, message, reply)
            return reply

    reply = random.choice(FALLBACKS)
    save_chat_memory(user, message, reply)
    return reply


router = APIRouter()

@router.post("/chat")
def chat(body: ChatRequest, user: str = Depends(current_user)):
    students = get_students()
    reply = bot_reply(body.message, students, user=user)   # no save
    return {"reply": reply}

@router.post("/chatnew")
def chatnew(body: ChatRequest, user: str = Depends(current_user)):
    students = get_students()
    reply = bot_reply_new(body.message, students, user=user)  # saves to DB
    return {"reply": reply}
