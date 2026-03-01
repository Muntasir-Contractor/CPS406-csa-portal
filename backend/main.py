from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import dbfuncs
import uvicorn

app = FastAPI()
origins = [
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:5173"

]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"Hello": "World"}

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

@app.post("/studentapplication")
def student_application(data: SubmissionApplication):
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

@app.post("/coordinator/login")
def coordinator_login(data: CoordinatorCredentials):
    name = dbfuncs.coordinator_login(data.email, data.password)
    if name is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"name": name, "email": data.email}

@app.get("/applications")
def get_applications():
    return dbfuncs.get_all_applications()

@app.post("/studentapplication/{student_id}/accept")
def accept_student(student_id: int):
    if not dbfuncs.accept_student(student_id):
        raise HTTPException(status_code=404, detail="Student application not found")
    return {"message": "Student accepted"}

@app.post("/studentapplication/{student_id}/reject")
def reject_student(student_id: int):
    dbfuncs.reject_student(student_id)
    return {"message": "Student rejected"}
