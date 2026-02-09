import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import init_db
from app.api.v1.ocr import router as ocr_router
from app.api.v1.payment import router as payment_router
from app.metrics import metrics_router, http_requests, http_request_duration, crawler_visits

BOT_PATTERNS = ["Googlebot", "bingbot", "Baiduspider", "YandexBot", "DuckDuckBot", "Slurp", "facebookexternalhit"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Textbook OCR API",
    description="AI-powered OCR for textbooks with LaTeX formula support",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Track crawler visits
    ua = request.headers.get("user-agent", "")
    for bot in BOT_PATTERNS:
        if bot.lower() in ua.lower():
            crawler_visits.labels(tool="textbook-ocr", bot=bot).inc()
            break
    
    response = await call_next(request)
    
    # Track request metrics
    duration = time.time() - start_time
    endpoint = request.url.path
    method = request.method
    status = response.status_code
    
    http_requests.labels(
        tool="textbook-ocr",
        endpoint=endpoint,
        method=method,
        status=status
    ).inc()
    
    http_request_duration.labels(
        tool="textbook-ocr",
        endpoint=endpoint,
        method=method
    ).observe(duration)
    
    return response


# Include routers
app.include_router(ocr_router, prefix="/api/v1")
app.include_router(payment_router, prefix="/api/v1")
app.include_router(metrics_router)


@app.get("/")
async def root():
    return {
        "name": "Textbook OCR API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "textbook-ocr"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )
