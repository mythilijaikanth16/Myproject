import mysql.connector
from mysql.connector import Error

# ── Database config ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "user":     "root",        
    "password": "rootvm@kms",
    "database": "mythili_test",  
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
        conn.commit()
        print("✅ Database initialized successfully.")
    except Error as e:
        print(f"❌ Error creating tables: {e}")
    finally:
        cursor.close()
        conn.close()
