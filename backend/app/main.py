
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import solve
from app.config import get_settings

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(
    title="TriMind AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Register API routes
app.include_router(solve.router, prefix="/api/v1")


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "TriMind Backend is running!",
        "status": "success",
        "docs": "/docs"
    }


# Health check endpoint
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "TriMind AI",
        "version": "1.0.0"
    }
