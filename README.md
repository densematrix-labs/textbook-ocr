# Textbook OCR

AI-powered OCR for textbooks with LaTeX formula support.

## Features

- 📄 Upload PDF or images (JPEG, PNG, WebP)
- 📐 Accurate LaTeX formula recognition
- ✍️ Clean Markdown output
- 🌐 7 languages supported
- ⚡ Fast processing

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI
- **OCR**: Gemini 2.5 Pro (via llm-proxy)
- **PDF Processing**: PyMuPDF (600 DPI)

## Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
# Backend
cd backend
pytest --cov=app --cov-fail-under=95

# Frontend
cd frontend
npm run test:coverage
```

## Deployment

```bash
docker compose up -d --build
```

## License

© DenseMatrix
