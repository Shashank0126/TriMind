# TriMind AI

Ask a question via text, upload an image, or provide both -> Gemini 2.5 Flash, Gemini Reasoner, and Groq each solve it independently -> three answers side by side.
(No consensus, scoring, history, auth or database by design.)

## Setup

### 1. Backend (Python 3.11+)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# edit .env and add your three API keys (it is a copy of .env.example)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Node 18+)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (the dev server proxies `/api` to port 8000).

### API keys
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys

## Endpoints
- `POST /api/v1/solve/stream` - multipart fields `file` (optional) and `text` (optional); Server-Sent Events, one `result` event per provider as it finishes (used by the UI).
- `POST /api/v1/solve` - same inputs, returns `{ "results": { gemini_flash, gemini, groq } }` after all finish.
- `GET /api/v1/models` - configured model IDs.

## Models
Set `OPENAI_MODEL`, `GEMINI_MODEL`, `GROQ_VISION_MODEL` in `backend/.env`. Vision model names change often; if a call fails with "model not found", check the provider's current model list.

## Groq OCR fallback
If the Groq vision model rejects the image (or `GROQ_FORCE_OCR=true`), the backend OCRs the image with Tesseract and sends the text to `GROQ_TEXT_MODEL`. Install the Tesseract binary:
macOS `brew install tesseract` / Ubuntu `sudo apt install tesseract-ocr` / Windows: https://github.com/UB-Mannheim/tesseract/wiki

## Production notes
`npm run build`, serve `frontend/dist` from any static host, set `VITE_API_URL` at build time to the API origin, and add that origin to `CORS_ORIGINS`. Disable proxy buffering for SSE (the API already sends `X-Accel-Buffering: no`).
