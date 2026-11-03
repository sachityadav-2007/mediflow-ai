"""
MediFlow AI 2.0 — Machine Learning Service Configuration
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")
    
    APP_NAME: str = "MediFlow AI ML Service"
    VERSION: str = "2.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("ML_SERVICE_PORT", "5002"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Internal service token for secure Express <-> FastAPI communication
    ML_SERVICE_SECRET: str = os.getenv("ML_SERVICE_SECRET", "mediflow_internal_ml_service_secret_2026")
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    DATASETS_DIR: Path = BASE_DIR / "datasets"
    REGISTRY_PATH: Path = BASE_DIR / "artifacts" / "model_registry.json"
    
    # Database connection for data extraction pipeline (optional read-only)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mediflow_ai")

settings = Settings()
