# Mock Interviewer

An AI-powered mock interview simulator that conducts personalized practice interviews based on your resume and a job description.

## How it works

1. Upload your resume (PDF) and paste a job description
2. The AI interviewer greets you and asks tailored questions covering behavioral, technical, and situational areas
3. Respond naturally — the interviewer follows up based on your answers
4. Practice as many rounds as you want

## Tech stack

- **Frontend** — React + Vite + Tailwind CSS
- **Backend** — Python + FastAPI with streaming responses (SSE)
- **AI** — Anthropic Claude API

## Running locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your Anthropic API key to .env

uvicorn main:app --reload --reload-dir .
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Environment variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
