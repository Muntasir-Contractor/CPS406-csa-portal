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
