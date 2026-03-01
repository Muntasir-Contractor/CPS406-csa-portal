import sqlite3
from auth import hash_password, verify_password

CONN = "db\csa.db"

def student_application_exists(id):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute("SELECT student_id FROM student_application WHERE student_id = ?", (id,))
    status = cursor.fetchone()
    cursor.close()
    conn.close()
    return status is not None

def insert_student_application(id, fullname, email, password):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO student_application (student_id, full_name, email, password, status) VALUES (?, ?, ?, ?, 'pending')",
        (id, fullname, email, hash_password(password))
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_application_status(student_id, password):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT password, status, submitted_at, status_updated_at FROM student_application WHERE student_id = ?",
        (student_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row is None or not verify_password(password, row[0]):
        return None
    return {"status": row[1], "submitted_at": row[2], "status_updated_at": row[3]}

def update_student_application_status(student_id, new_status):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_application SET status = ?, status_updated_at = datetime('now') WHERE student_id = ?",
        (new_status, student_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def coordinator_login(email, password):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute("SELECT name, password FROM coordinator WHERE email = ?", (email,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row is None or not verify_password(password, row[1]):
        return None
    return row[0]

def get_all_applications():
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT student_id, full_name, email, status, submitted_at, status_updated_at FROM student_application ORDER BY submitted_at DESC"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "student_id": r[0],
            "full_name": r[1],
            "email": r[2],
            "status": r[3],
            "submitted_at": r[4],
            "status_updated_at": r[5],
        }
        for r in rows
    ]

def accept_student(student_id):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM student_application WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        conn.close()
        return False
    cursor.execute(
        "UPDATE student_application SET status = 'accepted', status_updated_at = datetime('now') WHERE student_id = ?",
        (student_id,)
    )
    cursor.execute(
        "INSERT OR REPLACE INTO student_login (id, password) VALUES (?, ?)",
        (student_id, row[0])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def reject_student(student_id):
    conn = sqlite3.connect(CONN)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_application SET status = 'rejected', status_updated_at = datetime('now') WHERE student_id = ?",
        (student_id,)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True
