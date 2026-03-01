from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

@app.post("/studentapplication")
def student_application(data : SubmissionApplication):
    """ Check if there already exists in db""""
    return {"message": "Application Successful"}