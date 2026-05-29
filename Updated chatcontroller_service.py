import random
from fastapi import APIRouter, Depends
from json_student import ChatRequest
from auth_service import current_user
from student_service import get_students
import subprocess
import json
import os

INTENT_REPLIES = {
    "register": ["📋 Go to Register tab and fill student details."],
    "delete":   ["🗑️ Click delete icon near the student."],
    "edit":     ["✏️ Click edit icon to update student details."],
    "search":   ["🔍 Use the search bar to find students."],
    "file":     ["📄 You can upload PDF, DOC, DOCX or image files."],
    "logout":   ["👋 Click Sign out button."],
    "greet":    ["👋 Hello! I'm Regs chatbot."],
}

INTENT_KEYS = {
    "register": ["register", "add student", "new student", "enroll"],
    "delete":   ["delete", "remove", "erase"],
    "edit":     ["edit", "update", "modify"],
    "search":   ["search", "find", "locate"],
    "file":     ["file", "upload", "document", "pdf"],
    "logout":   ["logout", "sign out"],
    "greet":    ["hi", "hello", "hey"],
}

FALLBACKS = [
    "I didn't understand 🤖",
    "Please rephrase your question 😊"
]

def bot_reply(message: str, students: list[dict]):
    m = message.lower()

    if any(k in m for k in ["how many", "count", "total"]):
        return f"📊 Total students: {len(students)}"

    if any(k in m for k in ["ascending", "a to z", "a-z"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s["name"])
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_students))
        return f"📚 Students A→Z:\n\n{lines}"

    if any(k in m for k in ["descending", "z to a", "z-a"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s["name"], reverse=True)
        lines = "\n".join(f"{i+1}. {s['name']}" for i, s in enumerate(sorted_students))
        return f"📚 Students Z→A:\n\n{lines}"

    if any(k in m for k in ["class wise", "classwise", "sort by class", "group by class"]):
        if not students:
            return "No students found."
        sorted_students = sorted(students, key=lambda s: s.get("student_class", "").lower())
        lines = "\n".join(
            f"{i+1}. {s['name']} — {s.get('student_class', '')} ({s.get('roll_no', '')})"
            for i, s in enumerate(sorted_students)
        )
        return f"🏫 Students sorted by class:\n\n{lines}"

    if "class" in m or "section" in m:
        words = m.split()
        cls_name = words[-1].lower()
        filtered = [s for s in students if s.get("student_class", "").lower() == cls_name]
        if filtered:
            lines = "\n".join(f"{i+1}. {s['name']} ({s.get('roll_no', '')})" for i, s in enumerate(filtered))
            return f"🏫 Students in class {cls_name.upper()}:\n\n{lines}"
        return f"No students found in class '{cls_name.upper()}'."

    if "roll" in m:
        words = m.split()
        roll = words[-1].lower()
        student = next((s for s in students if str(s.get("roll_no", "")).lower() == roll), None)
        if student:
            return (
                f"🎓 Student Found\n\n"
                f"**Name:** {student['name']}\n"
                f"**Roll:** {student['roll_no']}\n"
                f"**Class:** {student['student_class']}"
            )
        return f"No student found with roll number '{roll}'."

    for prefix in ["find ", "search ", "show "]:
        if m.startswith(prefix):
            query = m[len(prefix):].strip()
            found = [s for s in students if query in s["name"].lower()]
            if found:
                lines = "\n".join(f"{i+1}. {s['name']} — {s['student_class']}" for i, s in enumerate(found))
                return f"🔍 Found:\n\n{lines}"
            return f"No students found matching '{query}'."

    for intent, keywords in INTENT_KEYS.items():
        if any(k in m for k in keywords):
            return random.choice(INTENT_REPLIES[intent])

    return random.choice(FALLBACKS)


GPT_API_URL = "http://10.30.1.42:11434/api/generate"
GPT_API_KEY = "your-openai-api-key-here"   # replace with your key
 
MEMORY_FILE = "chat_memory.json" 

def load_memory() -> list:
    if not os.path.exists(MEMORY_FILE):
        return []
    with open(MEMORY_FILE) as f:
        return json.load(f)
 
def save_memory(question: str, answer: str):
    memory = load_memory()
    memory.append({"question": question, "answer": answer})
    memory = memory[-5:]   # keep only last 5 Q&A
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2,ensure_ascii=False)

def bot_reply_new(message: str, students: list[dict]):

    m = message.lower()

    

    # ── For all other questions — send to Ollama ──────────────────────────────

    if students:
        student_lines = "\n".join([
            f"- Name: {s.get('name', '')}, Class: {s.get('student_class', '')}, "
            f"Roll No: {s.get('roll_no', '')}, File: {'Yes' if s.get('file_url') else 'No'}"
            for s in students
        ])
        context = f"There are exactly {len(students)} students:\n{student_lines}"
    else:
        context = "There are no students registered yet."

    # ── Phase 2: Load last 5 Q&A from memory ──────────────────────────────────
    memory = load_memory()
    memory_text = ""
    if memory:
        memory_lines = "\n".join([
            f"Q: {m['question']}\nA: {m['answer']}"
            for m in memory
        ])
        memory_text = f"\n\nPrevious conversation:\n{memory_lines}"

    # ── Step 2: Prepare prompt with context and message ───────────────────────
    system_prompt = (
        "You are Regs, a student registry assistant. "
        "Answer using ONLY the exact student data provided. "
        "Do NOT use prior knowledge or make assumptions."
    )

    full_prompt = (
        f"{context}\n\n"
        f"User question: {message}"
        f"{memory_text}"
    )

    # ── Step 3: Use urllib to send prompt to Ollama ───────────────────────────
    import urllib.request

    payload = json.dumps({
        "model": "qwen2.5-coder:3b",
        "prompt": f"{system_prompt}\n\n{full_prompt}",
        "stream": False,
    }).encode("utf-8")

    req = urllib.request.Request(
        GPT_API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    # ── Step 4: Check response and return ─────────────────────────────────────
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw  = response.read().decode("utf-8")
            data = json.loads(raw)

            if "error" in data:
                return f"⚠️ Ollama error: {data['error']}"

            reply = data["response"].strip()

            # ── Phase 2: Save Q&A to memory ───────────────────────────────────
            save_memory(question=message, answer=reply)

            return reply

    except json.JSONDecodeError:
        return "⚠️ Could not parse Ollama response."
    except Exception as e:
        return f"⚠️ Error: {str(e)}"
   # merge the srudents in to single string like a context

    # prepare promt with context and message

    # use pythong curl to send this promt with the gpt url 

    # check the resonse and return the repsonse

    #phase-2 : adding memory : we will save every question and answer to db 
    # then along with prmot we will provide lat 5 questiona nd answers 

    # ── Fallback ───────────────────────────────
    



router = APIRouter()

@router.post("/chat")
def chat(body: ChatRequest, user: str = Depends(current_user)):
    students = get_students()
    reply = bot_reply(body.message, students)
    return {"reply": reply}

@router.post("/chatnew")
def chatnew(body: ChatRequest, user: str = Depends(current_user)):
    students = get_students()
    reply = bot_reply_new(body.message, students)
    return {"reply": reply}

