import sqlite3
import os
import secrets
from datetime import datetime, timedelta
from auth import hash_password, verify_password

CONN = os.path.join(os.path.dirname(__file__), "db", "csa.db")

def get_conn():
    conn = sqlite3.connect(CONN)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_conn()
    cursor = conn.cursor()

    # Add columns to student_application if missing
    cursor.execute("PRAGMA table_info(student_application)")
    cols = [r[1] for r in cursor.fetchall()]
    if "is_finalized" not in cols:
        cursor.execute("ALTER TABLE student_application ADD COLUMN is_finalized INTEGER DEFAULT 0")
    if "failed_login_attempts" not in cols:
        cursor.execute("ALTER TABLE student_application ADD COLUMN failed_login_attempts INTEGER DEFAULT 0")
    if "locked_until" not in cols:
        cursor.execute("ALTER TABLE student_application ADD COLUMN locked_until TEXT")

    # Add columns to coordinator if missing
    cursor.execute("PRAGMA table_info(coordinator)")
    cols = [r[1] for r in cursor.fetchall()]
    if "failed_login_attempts" not in cols:
        cursor.execute("ALTER TABLE coordinator ADD COLUMN failed_login_attempts INTEGER DEFAULT 0")
    if "locked_until" not in cols:
        cursor.execute("ALTER TABLE coordinator ADD COLUMN locked_until TEXT")

    # Add columns to student_login if missing
    cursor.execute("PRAGMA table_info(student_login)")
    cols = [r[1] for r in cursor.fetchall()]
    if "failed_login_attempts" not in cols:
        cursor.execute("ALTER TABLE student_login ADD COLUMN failed_login_attempts INTEGER DEFAULT 0")
    if "locked_until" not in cols:
        cursor.execute("ALTER TABLE student_login ADD COLUMN locked_until TEXT")

    # Employer table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            supervisor_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            approved INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT
        )
    """)

    # Work term reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS work_term_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            work_term TEXT NOT NULL,
            submitted_at TEXT DEFAULT (datetime('now')),
            is_late INTEGER DEFAULT 0,
            FOREIGN KEY (student_id) REFERENCES student_application(student_id)
        )
    """)

    # Evaluations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employer_id INTEGER,
            submitted_by_role TEXT NOT NULL DEFAULT 'employer',
            student_id INTEGER NOT NULL,
            work_term TEXT NOT NULL,
            behaviour TEXT,
            skills TEXT,
            knowledge TEXT,
            attitude TEXT,
            pdf_path TEXT,
            submitted_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (employer_id) REFERENCES employer(id),
            FOREIGN KEY (student_id) REFERENCES student_application(student_id)
        )
    """)

    # Student-employer assignments
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_employer_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            employer_id INTEGER NOT NULL,
            work_term TEXT NOT NULL,
            UNIQUE(student_id, employer_id, work_term),
            FOREIGN KEY (student_id) REFERENCES student_application(student_id),
            FOREIGN KEY (employer_id) REFERENCES employer(id)
        )
    """)

    # Rejections table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rejections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            rejection_type TEXT NOT NULL,
            acting_role TEXT NOT NULL,
            reason TEXT,
            date TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (student_id) REFERENCES student_application(student_id)
        )
    """)

    # Audit log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            acting_role TEXT NOT NULL,
            acting_user TEXT,
            timestamp TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (student_id) REFERENCES student_application(student_id)
        )
    """)

    # Deadlines table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deadlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_term TEXT UNIQUE NOT NULL,
            deadline_date TEXT NOT NULL
        )
    """)

    # Reminders table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            sent_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (student_id) REFERENCES student_application(student_id)
        )
    """)

    conn.commit()
    cursor.close()
    conn.close()


# ── Student Application ──

def student_application_exists(id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT student_id FROM student_application WHERE student_id = ?", (id,))
    status = cursor.fetchone()
    cursor.close()
    conn.close()
    return status is not None

def insert_student_application(id, fullname, email, password):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO student_application (student_id, full_name, email, password, status, submitted_at) VALUES (?, ?, ?, ?, 'pending', datetime('now'))",
        (id, fullname, email, hash_password(password))
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_application_status(student_id, password):
    conn = get_conn()
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
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_application SET status = ?, status_updated_at = datetime('now') WHERE student_id = ?",
        (new_status, student_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_all_applications():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT student_id, full_name, email, status, submitted_at, status_updated_at, is_finalized FROM student_application ORDER BY submitted_at DESC"
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
            "is_finalized": r[6] if len(r) > 6 else 0,
        }
        for r in rows
    ]


# ── Accept / Reject with Audit Log + Finalization ──

def is_application_finalized(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT is_finalized FROM student_application WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row is None:
        return None
    return bool(row[0])

def accept_student(student_id, acting_role="coordinator", acting_user=None):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT password, is_finalized FROM student_application WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        conn.close()
        return False
    if row[1]:
        cursor.close()
        conn.close()
        return "finalized"
    cursor.execute(
        "UPDATE student_application SET status = 'accepted', status_updated_at = datetime('now') WHERE student_id = ?",
        (student_id,)
    )
    cursor.execute(
        "INSERT OR REPLACE INTO student_login (id, password) VALUES (?, ?)",
        (student_id, row[0])
    )
    cursor.execute(
        "INSERT INTO audit_log (student_id, action, acting_role, acting_user) VALUES (?, 'accept', ?, ?)",
        (student_id, acting_role, acting_user)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def reject_student(student_id, acting_role="coordinator", acting_user=None, reason=None):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT is_finalized FROM student_application WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        conn.close()
        return False
    if row[0]:
        cursor.close()
        conn.close()
        return "finalized"
    cursor.execute(
        "UPDATE student_application SET status = 'rejected', status_updated_at = datetime('now') WHERE student_id = ?",
        (student_id,)
    )
    cursor.execute(
        "INSERT INTO rejections (student_id, rejection_type, acting_role, reason) VALUES (?, 'program', ?, ?)",
        (student_id, acting_role, reason)
    )
    cursor.execute(
        "INSERT INTO audit_log (student_id, action, acting_role, acting_user) VALUES (?, 'reject', ?, ?)",
        (student_id, acting_role, acting_user)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def finalize_application(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM student_application WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        conn.close()
        return False
    if row[0] not in ("accepted", "rejected", "withdrawn"):
        cursor.close()
        conn.close()
        return "not_ready"
    cursor.execute(
        "UPDATE student_application SET is_finalized = 1, status_updated_at = datetime('now') WHERE student_id = ?",
        (student_id,)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True


# ── Account Lockout ──

def _check_lockout(conn, table, id_col, id_val):
    cursor = conn.cursor()
    cursor.execute(f"SELECT failed_login_attempts, locked_until FROM {table} WHERE {id_col} = ?", (id_val,))
    row = cursor.fetchone()
    cursor.close()
    if row is None:
        return None
    attempts, locked_until = row
    if locked_until:
        lock_time = datetime.fromisoformat(locked_until)
        if datetime.utcnow() < lock_time:
            return "locked"
        else:
            cur2 = conn.cursor()
            cur2.execute(f"UPDATE {table} SET failed_login_attempts = 0, locked_until = NULL WHERE {id_col} = ?", (id_val,))
            conn.commit()
            cur2.close()
    return attempts or 0

def _record_failed_attempt(conn, table, id_col, id_val):
    cursor = conn.cursor()
    cursor.execute(f"SELECT failed_login_attempts FROM {table} WHERE {id_col} = ?", (id_val,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        return
    new_count = (row[0] or 0) + 1
    if new_count >= 5:
        lock_until = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        cursor.execute(f"UPDATE {table} SET failed_login_attempts = ?, locked_until = ? WHERE {id_col} = ?",
                       (new_count, lock_until, id_val))
    else:
        cursor.execute(f"UPDATE {table} SET failed_login_attempts = ? WHERE {id_col} = ?",
                       (new_count, id_val))
    conn.commit()
    cursor.close()

def _reset_failed_attempts(conn, table, id_col, id_val):
    cursor = conn.cursor()
    cursor.execute(f"UPDATE {table} SET failed_login_attempts = 0, locked_until = NULL WHERE {id_col} = ?", (id_val,))
    conn.commit()
    cursor.close()


# ── Coordinator Login ──

def coordinator_login(email, password):
    conn = get_conn()
    lockout = _check_lockout(conn, "coordinator", "email", email)
    if lockout == "locked":
        conn.close()
        return "locked"
    if lockout is None:
        conn.close()
        return None

    cursor = conn.cursor()
    cursor.execute("SELECT name, password FROM coordinator WHERE email = ?", (email,))
    row = cursor.fetchone()
    cursor.close()
    if row is None or not verify_password(password, row[1]):
        _record_failed_attempt(conn, "coordinator", "email", email)
        conn.close()
        return None
    _reset_failed_attempts(conn, "coordinator", "email", email)
    conn.close()
    return row[0]


# ── Student Login ──

def student_login(student_id, password):
    conn = get_conn()
    lockout = _check_lockout(conn, "student_login", "id", student_id)
    if lockout == "locked":
        conn.close()
        return "locked"
    if lockout is None:
        conn.close()
        return None

    cursor = conn.cursor()
    cursor.execute("SELECT id, password FROM student_login WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    cursor.close()
    if row is None or not verify_password(password, row[1]):
        if row is not None:
            _record_failed_attempt(conn, "student_login", "id", student_id)
        conn.close()
        return None
    _reset_failed_attempts(conn, "student_login", "id", student_id)

    cursor2 = conn.cursor()
    cursor2.execute("SELECT full_name, email FROM student_application WHERE student_id = ?", (student_id,))
    info = cursor2.fetchone()
    cursor2.close()
    conn.close()
    if info is None:
        return None
    return {"student_id": student_id, "full_name": info[0], "email": info[1]}


# ── Employer Account ──

def employer_exists(email):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM employer WHERE email = ?", (email,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None

def register_employer(company_name, supervisor_name, email, password):
    conn = get_conn()
    cursor = conn.cursor()
    token = secrets.token_urlsafe(32)
    cursor.execute(
        "INSERT INTO employer (company_name, supervisor_name, email, password, verification_token) VALUES (?, ?, ?, ?, ?)",
        (company_name, supervisor_name, email, hash_password(password), token)
    )
    conn.commit()
    employer_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return {"id": employer_id, "verification_token": token}

def verify_employer_email(token):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM employer WHERE verification_token = ?", (token,))
    row = cursor.fetchone()
    if row is None:
        cursor.close()
        conn.close()
        return False
    cursor.execute("UPDATE employer SET email_verified = 1, verification_token = NULL WHERE id = ?", (row[0],))
    conn.commit()
    cursor.close()
    conn.close()
    return True

def employer_login(email, password):
    conn = get_conn()
    lockout = _check_lockout(conn, "employer", "email", email)
    if lockout == "locked":
        conn.close()
        return "locked"
    if lockout is None:
        conn.close()
        return None

    cursor = conn.cursor()
    cursor.execute("SELECT id, company_name, supervisor_name, password, email_verified, approved FROM employer WHERE email = ?", (email,))
    row = cursor.fetchone()
    cursor.close()
    if row is None or not verify_password(password, row[3]):
        if row is not None:
            _record_failed_attempt(conn, "employer", "email", email)
        conn.close()
        return None
    _reset_failed_attempts(conn, "employer", "email", email)
    conn.close()
    return {
        "id": row[0],
        "company_name": row[1],
        "supervisor_name": row[2],
        "email": email,
        "email_verified": bool(row[4]),
        "approved": bool(row[5]),
    }

def get_all_employers():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id, company_name, supervisor_name, email, email_verified, approved, created_at FROM employer ORDER BY created_at DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": r[0], "company_name": r[1], "supervisor_name": r[2],
            "email": r[3], "email_verified": bool(r[4]), "approved": bool(r[5]),
            "created_at": r[6],
        }
        for r in rows
    ]

def approve_employer(employer_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE employer SET approved = 1 WHERE id = ?", (employer_id,))
    changed = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return changed > 0


# ── Work Term Reports ──

def save_work_term_report(student_id, file_path, file_name, work_term):
    conn = get_conn()
    cursor = conn.cursor()

    # Check deadline
    is_late = 0
    cursor.execute("SELECT deadline_date FROM deadlines WHERE work_term = ?", (work_term,))
    dl_row = cursor.fetchone()
    if dl_row and dl_row[0]:
        deadline = datetime.fromisoformat(dl_row[0])
        if datetime.utcnow() > deadline:
            is_late = 1

    # Replace previous report for same student + work_term (C-14)
    cursor.execute("SELECT file_path FROM work_term_reports WHERE student_id = ? AND work_term = ?", (student_id, work_term))
    old = cursor.fetchone()
    if old:
        if old[0] and os.path.exists(old[0]):
            os.remove(old[0])
        cursor.execute("DELETE FROM work_term_reports WHERE student_id = ? AND work_term = ?", (student_id, work_term))

    cursor.execute(
        "INSERT INTO work_term_reports (student_id, file_path, file_name, work_term, is_late) VALUES (?, ?, ?, ?, ?)",
        (student_id, file_path, file_name, work_term, is_late)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"is_late": bool(is_late)}

def get_student_reports(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, file_name, work_term, submitted_at, is_late FROM work_term_reports WHERE student_id = ? ORDER BY submitted_at DESC",
        (student_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"id": r[0], "file_name": r[1], "work_term": r[2], "submitted_at": r[3], "is_late": bool(r[4])} for r in rows]

def get_all_reports():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT w.id, w.student_id, s.full_name, w.file_name, w.work_term, w.submitted_at, w.is_late
        FROM work_term_reports w
        JOIN student_application s ON w.student_id = s.student_id
        ORDER BY w.submitted_at DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"id": r[0], "student_id": r[1], "full_name": r[2], "file_name": r[3],
         "work_term": r[4], "submitted_at": r[5], "is_late": bool(r[6])}
        for r in rows
    ]


# ── Evaluations ──

def submit_evaluation(employer_id, student_id, work_term, behaviour=None, skills=None, knowledge=None, attitude=None, pdf_path=None, submitted_by_role="employer"):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO evaluations (employer_id, submitted_by_role, student_id, work_term, behaviour, skills, knowledge, attitude, pdf_path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (employer_id, submitted_by_role, student_id, work_term, behaviour, skills, knowledge, attitude, pdf_path)
    )
    eval_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return eval_id

def get_evaluations_for_student(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.employer_id, e.submitted_by_role, e.student_id, e.work_term,
               e.behaviour, e.skills, e.knowledge, e.attitude, e.pdf_path, e.submitted_at,
               emp.company_name, emp.supervisor_name
        FROM evaluations e
        LEFT JOIN employer emp ON e.employer_id = emp.id
        WHERE e.student_id = ?
        ORDER BY e.submitted_at DESC
    """, (student_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": r[0], "employer_id": r[1], "submitted_by_role": r[2],
            "student_id": r[3], "work_term": r[4], "behaviour": r[5],
            "skills": r[6], "knowledge": r[7], "attitude": r[8],
            "pdf_path": r[9], "submitted_at": r[10],
            "company_name": r[11], "supervisor_name": r[12],
        }
        for r in rows
    ]

def get_all_evaluations():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.employer_id, e.submitted_by_role, e.student_id, e.work_term,
               e.behaviour, e.skills, e.knowledge, e.attitude, e.pdf_path, e.submitted_at,
               emp.company_name, emp.supervisor_name, s.full_name
        FROM evaluations e
        LEFT JOIN employer emp ON e.employer_id = emp.id
        LEFT JOIN student_application s ON e.student_id = s.student_id
        ORDER BY e.submitted_at DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": r[0], "employer_id": r[1], "submitted_by_role": r[2],
            "student_id": r[3], "work_term": r[4], "behaviour": r[5],
            "skills": r[6], "knowledge": r[7], "attitude": r[8],
            "pdf_path": r[9], "submitted_at": r[10],
            "company_name": r[11], "supervisor_name": r[12],
            "student_name": r[13],
        }
        for r in rows
    ]

def evaluation_exists(evaluation_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM evaluations WHERE id = ?", (evaluation_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


# ── Student-Employer Assignments ──

def assign_student_to_employer(student_id, employer_id, work_term):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO student_employer_assignments (student_id, employer_id, work_term) VALUES (?, ?, ?)",
            (student_id, employer_id, work_term)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        cursor.close()
        conn.close()
        return False
    cursor.close()
    conn.close()
    return True

def is_student_assigned_to_employer(student_id, employer_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT work_term FROM student_employer_assignments WHERE student_id = ? AND employer_id = ?",
        (student_id, employer_id)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [r[0] for r in rows]

def get_employer_assigned_students(employer_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.student_id, s.full_name, s.email, a.work_term
        FROM student_employer_assignments a
        JOIN student_application s ON a.student_id = s.student_id
        WHERE a.employer_id = ?
        ORDER BY a.work_term DESC
    """, (employer_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"student_id": r[0], "full_name": r[1], "email": r[2], "work_term": r[3]} for r in rows]


# ── Placement Rejection ──

def record_placement_rejection(student_id, employer_id, reason=None):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT supervisor_name FROM employer WHERE id = ?", (employer_id,))
    emp = cursor.fetchone()
    acting_user = emp[0] if emp else None

    cursor.execute(
        "INSERT INTO rejections (student_id, rejection_type, acting_role, reason) VALUES (?, 'placement', 'employer', ?)",
        (student_id, reason)
    )
    cursor.execute(
        "INSERT INTO audit_log (student_id, action, acting_role, acting_user) VALUES (?, 'reject', 'employer', ?)",
        (student_id, acting_user)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_rejections_for_student(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, rejection_type, acting_role, reason, date FROM rejections WHERE student_id = ? ORDER BY date DESC",
        (student_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"id": r[0], "rejection_type": r[1], "acting_role": r[2], "reason": r[3], "date": r[4]} for r in rows]


# ── Audit Log ──

def get_audit_log(student_id=None):
    conn = get_conn()
    cursor = conn.cursor()
    if student_id:
        cursor.execute(
            "SELECT id, student_id, action, acting_role, acting_user, timestamp FROM audit_log WHERE student_id = ? ORDER BY timestamp DESC",
            (student_id,)
        )
    else:
        cursor.execute(
            "SELECT id, student_id, action, acting_role, acting_user, timestamp FROM audit_log ORDER BY timestamp DESC"
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {"id": r[0], "student_id": r[1], "action": r[2], "acting_role": r[3], "acting_user": r[4], "timestamp": r[5]}
        for r in rows
    ]


# ── Deadlines ──

def set_deadline(work_term, deadline_date):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO deadlines (work_term, deadline_date) VALUES (?, ?)",
        (work_term, deadline_date)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_deadline(work_term):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT deadline_date FROM deadlines WHERE work_term = ?", (work_term,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row[0] if row else None

def get_all_deadlines():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT work_term, deadline_date FROM deadlines ORDER BY deadline_date DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"work_term": r[0], "deadline_date": r[1]} for r in rows]


# ── Reminders ──

def send_reminder(student_id, message):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reminders (student_id, message) VALUES (?, ?)",
        (student_id, message)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return True

def get_reminders_for_student(student_id):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, message, sent_at FROM reminders WHERE student_id = ? ORDER BY sent_at DESC",
        (student_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"id": r[0], "message": r[1], "sent_at": r[2]} for r in rows]

def get_students_without_reports(work_term):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.student_id, s.full_name, s.email
        FROM student_application s
        WHERE s.status = 'accepted'
        AND s.student_id NOT IN (
            SELECT w.student_id FROM work_term_reports w WHERE w.work_term = ?
        )
    """, (work_term,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"student_id": r[0], "full_name": r[1], "email": r[2]} for r in rows]
