import mysql.connector
from mysql.connector import Error

# ── Database config ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",        
    "password": "rootvm@kms",
    "database": "mythili_test", 
    "charset":  "utf8mb4", 
}

# ── Get connection ─────────────────────────────────────────────────────────────
def get_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            return conn
    except Error as e:
        print(f"❌ MySQL connection failed: {e}")
        return None

# ── Create tables if not exists ────────────────────────────────────────────────
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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_memory (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                username   VARCHAR(255) NOT NULL,
                question   TEXT         NOT NULL,
                answer     TEXT         NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        """)
        conn.commit()
        print("✅ Database initialized.")
    except Error as e:
        print(f"❌ Error creating tables: {e}")
    finally:
        cursor.close()
        conn.close()

def save_chat_memory(username:str,question : str , answer :str):
    conn=get_connection()
    if not conn:
        return
    try:
        cursor=conn.cursor()
        cursor.execute("""
        INSERT INTO chat_memory(username,question,answer)
        VALUES(%s,%s,%s)
        """,(username,question,answer))
        conn.commit()

        cursor.execute("""
            DELETE FROM chat_memory
            WHERE username = %s
              AND id NOT IN (
                  SELECT id FROM (
                      SELECT id FROM chat_memory
                      WHERE username = %s
                      ORDER BY created_at DESC
                      LIMIT 5
                  ) AS keep
              )
        """, (username, username))
        conn.commit()
    except Error as e:
        print(f"❌ Error saving chat memory: {e}")
    finally:
        cursor.close()
        conn.close()

def get_chat_memory(username: str) -> list:
    conn = get_connection()
    if not conn:
        return []
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT question, answer FROM chat_memory
            WHERE username = %s
            ORDER BY created_at ASC
        """, (username,))
        return cursor.fetchall()
    except Error as e:
        print(f"❌ Error fetching chat memory: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

