import uuid
import io
import json
from typing import AsyncGenerator

import pdfplumber
import anthropic
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.AsyncAnthropic()

# In-memory session store: session_id -> {resume_text, jd_text, messages}
sessions: dict = {}

SYSTEM_PROMPT_TEMPLATE = """You are a professional interviewer conducting a mock job interview.

Candidate Resume:
{resume_text}

Job Description:
{jd_text}

Instructions:
- Ask one focused question at a time
- Cover behavioral, technical, and situational questions relevant to the role
- After the candidate answers, ask a natural follow-up or move to the next area
- Be encouraging but realistic
- Start by warmly greeting the candidate and asking your first interview question"""


@app.post("/start")
async def start_session(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Resume must be a PDF file.")

    pdf_bytes = await resume.read()
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        resume_text = "\n".join(
            page.extract_text() or "" for page in pdf.pages
        ).strip()

    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF.")

    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "resume_text": resume_text,
        "jd_text": job_description.strip(),
        "messages": [],
    }

    return {"session_id": session_id}


class ChatRequest(BaseModel):
    session_id: str
    message: str


async def stream_claude(session_id: str, user_message: str) -> AsyncGenerator[str, None]:
    session = sessions[session_id]
    session["messages"].append({"role": "user", "content": user_message})

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        resume_text=session["resume_text"],
        jd_text=session["jd_text"],
    )

    full_response = ""

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=session["messages"],
    ) as stream:
        async for text in stream.text_stream:
            full_response += text
            yield f"data: {json.dumps({'text': text})}\n\n"

    session["messages"].append({"role": "assistant", "content": full_response})
    yield "data: [DONE]\n\n"


@app.post("/chat")
async def chat(req: ChatRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return StreamingResponse(
        stream_claude(req.session_id, req.message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "ok"}
