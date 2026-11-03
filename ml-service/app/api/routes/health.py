"""
MediFlow AI 2.0 — ML Service Health Endpoint
"""

from fastapi import APIRouter
from app.core.config import settings
from app.services.predictor_service import predictor_service

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Returns the operational status of the ML service and loaded artifacts.
    Publicly accessible for health probes and monitoring.
    """
    status_info = predictor_service.get_models_status()
    all_loaded = all(status_info["models_loaded"].values())

    return {
        "status": "healthy" if all_loaded else "degraded",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "models_loaded": status_info["models_loaded"],
        "artifacts_dir": str(settings.ARTIFACTS_DIR),
        "registry_present": bool(predictor_service.registry)
    }

