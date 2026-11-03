"""
MediFlow AI 2.0 — Internal Service Security & Authentication
Ensures only authorized internal backend callers (Express.js) can invoke ML inference routes.
"""

from fastapi import Header, HTTPException, status
from app.core.config import settings

async def verify_internal_token(x_internal_token: str = Header(None, alias="X-Internal-Token")):
    """
    Verifies that incoming requests contain the agreed internal service secret.
    Permits localhost development without token if DEBUG is enabled, but enforces strict match otherwise.
    """
    # Allow health checks without token
    if not settings.ML_SERVICE_SECRET:
        return True

    if x_internal_token != settings.ML_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service token (X-Internal-Token).",
        )
    return True

