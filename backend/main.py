import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import dbfuncs
import re

app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize database on startup
dbfuncs.init_db()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not re.search(r"[a-zA-Z]", password):
        return "Password must contain at least one letter."
    if not re.search(r"[0-9]", password):
        return "Password must contain at least one number."
    return None


# ── Pydantic Models ──

class SubmissionApplication(BaseModel):
    student_name: str
    student_id: str
    email_address: str
    password: str

class StatusCheck(BaseModel):
    student_id: str
    password: str

class CoordinatorCredentials(BaseModel):
    email: str
    password: str

class StudentCredentials(BaseModel):
    student_id: str
    password: str

class EmployerRegister(BaseModel):
    company_name: str
    supervisor_name: str
    email: str
    password: str

class EmployerCredentials(BaseModel):
    email: str
    password: str

class EvaluationForm(BaseModel):
    employer_id: Optional[int] = None
    student_id: int
    work_term: str
    behaviour: Optional[str] = None
    skills: Optional[str] = None
    knowledge: Optional[str] = None
    attitude: Optional[str] = None
    submitted_by_role: str = "employer"

class PlacementRejection(BaseModel):
    student_id: int
    employer_id: int
    reason: Optional[str] = None

class DeadlineSet(BaseModel):
    work_term: str
    deadline_date: str

class ReminderSend(BaseModel):
    student_id: int
    message: str

class AssignStudent(BaseModel):
    student_id: int
    employer_id: int
    work_term: str


# ── Health Check ──

@app.get("/")
def root():
    return {"Hello": "World"}


# ── Student Application ──

@app.post("/studentapplication")
def student_application(data: SubmissionApplication):
    pw_error = validate_password(data.password)
    if pw_error:
        raise HTTPException(status_code=422, detail=pw_error)
    if not re.match(r"^\d{8}$", data.student_id):
        raise HTTPException(status_code=422, detail="Student ID must be exactly 8 digits.")
    if dbfuncs.student_application_exists(data.student_id):
        raise HTTPException(status_code=409, detail="Application already exists for this student ID")
    dbfuncs.insert_student_application(data.student_id, data.student_name, data.email_address, data.password)
    return {"message": "Application submitted successfully"}

@app.post("/studentapplication/status")
def check_application_status(data: StatusCheck):
    result = dbfuncs.get_application_status(data.student_id, data.password)
    if result is None:
        raise HTTPException(status_code=404, detail="No application found for the provided student ID and password")
    return {"student_id": data.student_id, **result}


# ── Student Login ──

@app.post("/student/login")
def student_login(data: StudentCredentials):
    result = dbfuncs.student_login(data.student_id, data.password)
    if result == "locked":
        raise HTTPException(status_code=423, detail="Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.")
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid student ID or password")
    return result


# ── Coordinator Login ──

@app.post("/coordinator/login")
def coordinator_login(data: CoordinatorCredentials):
    name = dbfuncs.coordinator_login(data.email, data.password)
    if name == "locked":
        raise HTTPException(status_code=423, detail="Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.")
    if name is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"name": name, "email": data.email}


# ── Applications Management ──

@app.get("/applications")
def get_applications():
    return dbfuncs.get_all_applications()

@app.post("/studentapplication/{student_id}/accept")
def accept_student(student_id: int):
    result = dbfuncs.accept_student(student_id, acting_role="coordinator")
    if result == "finalized":
        raise HTTPException(status_code=409, detail="Application is already finalized and cannot be changed.")
    if not result:
        raise HTTPException(status_code=404, detail="Student application not found")
    return {"message": "Student accepted"}

@app.post("/studentapplication/{student_id}/reject")
def reject_student(student_id: int, reason: Optional[str] = None):
    result = dbfuncs.reject_student(student_id, acting_role="coordinator", reason=reason)
    if result == "finalized":
        raise HTTPException(status_code=409, detail="Application is already finalized and cannot be changed.")
    if not result:
        raise HTTPException(status_code=404, detail="Student application not found")
    return {"message": "Student rejected"}

@app.post("/studentapplication/{student_id}/finalize")
def finalize_application(student_id: int):
    result = dbfuncs.finalize_application(student_id)
    if result == "not_ready":
        raise HTTPException(status_code=400, detail="Application must be in accepted, rejected, or withdrawn state to finalize.")
    if not result:
        raise HTTPException(status_code=404, detail="Student application not found")
    return {"message": "Application finalized"}


# ── Employer Registration & Login ──

@app.post("/employer/register")
def register_employer(data: EmployerRegister):
    pw_error = validate_password(data.password)
    if pw_error:
        raise HTTPException(status_code=422, detail=pw_error)
    if dbfuncs.employer_exists(data.email):
        raise HTTPException(status_code=409, detail="An employer account with this email already exists.")
    result = dbfuncs.register_employer(data.company_name, data.supervisor_name, data.email, data.password)
    return {"message": "Employer account created successfully. Please verify your email.", "verification_token": result["verification_token"], "id": result["id"]}

@app.post("/employer/verify-email")
def verify_employer_email(token: str):
    if dbfuncs.verify_employer_email(token):
        return {"message": "Email verified successfully."}
    raise HTTPException(status_code=404, detail="Invalid or expired verification token.")

@app.post("/employer/login")
def employer_login(data: EmployerCredentials):
    result = dbfuncs.employer_login(data.email, data.password)
    if result == "locked":
        raise HTTPException(status_code=423, detail="Account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.")
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return result

@app.get("/employers")
def get_employers():
    return dbfuncs.get_all_employers()

@app.post("/employer/{employer_id}/approve")
def approve_employer(employer_id: int):
    if dbfuncs.approve_employer(employer_id):
        return {"message": "Employer approved successfully."}
    raise HTTPException(status_code=404, detail="Employer not found.")


# ── File Upload: Work Term Reports ──

@app.post("/student/upload-report")
async def upload_report(
    student_id: int = Form(...),
    work_term: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File size exceeds the 10 MB limit.")

    safe_name = f"{student_id}_{work_term}_{file.filename}".replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    result = dbfuncs.save_work_term_report(student_id, file_path, file.filename, work_term)
    msg = "Report uploaded successfully."
    if result["is_late"]:
        msg += " Note: This report was submitted after the deadline."
    return {"message": msg, "is_late": result["is_late"]}

@app.get("/student/{student_id}/reports")
def get_student_reports(student_id: int):
    return dbfuncs.get_student_reports(student_id)

@app.get("/reports")
def get_all_reports():
    return dbfuncs.get_all_reports()


# ── Evaluations ──

@app.post("/evaluation/submit")
def submit_evaluation(data: EvaluationForm):
    if data.submitted_by_role == "employer" and data.employer_id:
        # Check employer is verified and approved
        from dbfuncs import get_conn
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT email_verified, approved FROM employer WHERE id = ?", (data.employer_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row is None:
            raise HTTPException(status_code=404, detail="Employer not found.")
        if not row[0]:
            raise HTTPException(status_code=403, detail="You must verify your email before submitting evaluations.")
        if not row[1]:
            raise HTTPException(status_code=403, detail="Your employer account must be approved by a coordinator before submitting evaluations.")

        # Check student is assigned to this employer (S20)
        work_terms = dbfuncs.is_student_assigned_to_employer(data.student_id, data.employer_id)
        if not work_terms:
            raise HTTPException(status_code=403, detail="You can only submit evaluations for students assigned to your organization.")
        if data.work_term not in work_terms:
            raise HTTPException(status_code=403, detail=f"Student is not assigned to your organization for work term '{data.work_term}'.")

    eval_id = dbfuncs.submit_evaluation(
        employer_id=data.employer_id,
        student_id=data.student_id,
        work_term=data.work_term,
        behaviour=data.behaviour,
        skills=data.skills,
        knowledge=data.knowledge,
        attitude=data.attitude,
        submitted_by_role=data.submitted_by_role,
    )
    return {"message": "Evaluation submitted successfully.", "evaluation_id": eval_id}

@app.post("/evaluation/submit-pdf")
async def submit_evaluation_pdf(
    employer_id: int = Form(...),
    student_id: int = Form(...),
    work_term: str = Form(...),
    file: UploadFile = File(...),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File size exceeds the 10 MB limit.")

    # Check employer verification and approval
    from dbfuncs import get_conn
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT email_verified, approved FROM employer WHERE id = ?", (employer_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Employer not found.")
    if not row[0]:
        raise HTTPException(status_code=403, detail="You must verify your email before submitting evaluations.")
    if not row[1]:
        raise HTTPException(status_code=403, detail="Your employer account must be approved by a coordinator before submitting evaluations.")

    # Check assignment
    work_terms = dbfuncs.is_student_assigned_to_employer(student_id, employer_id)
    if not work_terms or work_term not in work_terms:
        raise HTTPException(status_code=403, detail="You can only submit evaluations for students assigned to your organization.")

    safe_name = f"eval_{employer_id}_{student_id}_{work_term}_{file.filename}".replace(" ", "_")
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    eval_id = dbfuncs.submit_evaluation(
        employer_id=employer_id,
        student_id=student_id,
        work_term=work_term,
        pdf_path=file_path,
        submitted_by_role="employer",
    )
    return {"message": "Evaluation PDF submitted successfully.", "evaluation_id": eval_id}

@app.get("/evaluations/{student_id}")
def get_evaluations(student_id: int):
    return dbfuncs.get_evaluations_for_student(student_id)

@app.get("/evaluations")
def get_all_evaluations():
    return dbfuncs.get_all_evaluations()


# ── Student-Employer Assignments ──

@app.post("/assignment")
def assign_student(data: AssignStudent):
    if not dbfuncs.assign_student_to_employer(data.student_id, data.employer_id, data.work_term):
        raise HTTPException(status_code=409, detail="This assignment already exists.")
    return {"message": "Student assigned to employer successfully."}

@app.get("/employer/{employer_id}/students")
def get_employer_students(employer_id: int):
    return dbfuncs.get_employer_assigned_students(employer_id)


# ── Placement Rejection ──

@app.post("/placement-rejection")
def placement_rejection(data: PlacementRejection):
    dbfuncs.record_placement_rejection(data.student_id, data.employer_id, data.reason)
    return {"message": "Placement rejection recorded."}


# ── Rejections & Audit Log ──

@app.get("/rejections/{student_id}")
def get_rejections(student_id: int):
    return dbfuncs.get_rejections_for_student(student_id)

@app.get("/audit-log")
def get_audit_log(student_id: Optional[int] = None):
    return dbfuncs.get_audit_log(student_id)


# ── Deadlines ──

@app.post("/deadline")
def set_deadline(data: DeadlineSet):
    dbfuncs.set_deadline(data.work_term, data.deadline_date)
    return {"message": "Deadline set successfully."}

@app.get("/deadlines")
def get_deadlines():
    return dbfuncs.get_all_deadlines()


# ── Reminders ──

@app.post("/reminder")
def send_reminder(data: ReminderSend):
    dbfuncs.send_reminder(data.student_id, data.message)
    return {"message": "Reminder sent."}

@app.get("/student/{student_id}/reminders")
def get_student_reminders(student_id: int):
    return dbfuncs.get_reminders_for_student(student_id)

@app.get("/students-without-reports/{work_term}")
def students_without_reports(work_term: str):
    return dbfuncs.get_students_without_reports(work_term)
