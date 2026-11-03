"""
MediFlow AI 2.0 — Model Registry and Governance Routes (FastAPI)
"""

from fastapi import APIRouter, Depends
from app.core.security import verify_internal_token
from app.services.predictor_service import predictor_service

router = APIRouter(prefix="/models", tags=["Model Governance"], dependencies=[Depends(verify_internal_token)])

@router.get("/status")
async def get_models_status():
    """
    Returns runtime loaded model states, active versions, and registry metadata.
    """
    return predictor_service.get_models_status()

@router.get("/evaluation")
async def get_models_evaluation():
    """
    Returns detailed comparative evaluation metrics (baseline vs candidate),
    dataset sizes, date ranges, and insufficient-data explanations.
    """
    return predictor_service.registry

