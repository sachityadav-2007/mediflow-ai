"""
Test FastAPI Prediction and Governance Endpoints
"""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings

AUTH_HEADERS = {
    "X-Internal-Token": settings.ML_SERVICE_SECRET
}

@pytest.mark.asyncio
async def test_predict_waiting_time_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "doctor_id": "test-doc-01",
            "department": "Cardiology",
            "day_of_week": "MONDAY",
            "hour_of_day": 10,
            "queue_length_ahead": 3,
            "priority_level": "HIGH"
        }
        res = await client.post("/predict/waiting-time", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "ml-service"
        assert data["predicted_wait_minutes"] is not None

@pytest.mark.asyncio
async def test_auth_protection_blocks_invalid_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "doctor_id": "test-doc-01",
            "department": "Cardiology"
        }
        res = await client.post("/predict/waiting-time", json=payload, headers={"X-Internal-Token": "wrong-secret"})
        assert res.status_code == 401

@pytest.mark.asyncio
async def test_models_status_and_evaluation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/models/status", headers=AUTH_HEADERS)
        assert res.status_code == 200
        status_data = res.json()
        assert status_data["service"] == "MediFlow AI ML Service"
        assert "models_loaded" in status_data

        eval_res = await client.get("/models/evaluation", headers=AUTH_HEADERS)
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert "models" in eval_data
        assert "patient_waiting_time" in eval_data["models"]

