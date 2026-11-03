"""
MediFlow AI 2.0 — FastAPI Machine Learning Service Main Application
"""

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.predictor_service import predictor_service
from app.api.routes import health, predict, models_info

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=======================================================================")
    print(f"  Starting {settings.APP_NAME} v{settings.VERSION}")
    print(f"  Host: {settings.HOST}:{settings.PORT} | Debug: {settings.DEBUG}")
    print("=======================================================================")
    # Reload models if artifacts changed
    predictor_service.load_models()
    yield
    print(f"  Shutting down {settings.APP_NAME} gracefully...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Independent Machine Learning Inference and Governance Microservice for MediFlow AI 2.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(models_info.router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

