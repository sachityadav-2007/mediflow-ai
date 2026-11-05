"""
MediFlow AI 2.0 — Tests for Data Quality Audit and Controlled Retraining Endpoints
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings

@pytest.fixture
def auth_headers():
    return {"X-Internal-Token": settings.ML_SERVICE_SECRET}

@pytest.mark.asyncio
async def test_get_data_quality_requirements(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/data-quality/requirements", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "patient_waiting_time" in data
        assert "doctor_availability_and_delay" in data
        assert "appointment_duration" in data
        assert "department_demand_forecast" in data
        assert data["patient_waiting_time"]["min_labelled_samples"] >= 100
        assert "justification" in data["patient_waiting_time"]

@pytest.mark.asyncio
async def test_audit_empty_data_returns_insufficient(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {"appointments": [], "attendances": [], "doctors": []}
        res = await ac.post("/data-quality/audit", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["system_status"] == "INSUFFICIENT_DATA"
        assert data["can_retrain_production"] is False
        assert data["models"]["patient_waiting_time"]["status"] == "INSUFFICIENT_DATA"

@pytest.mark.asyncio
async def test_audit_detects_invalid_timestamps(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "appointments": [
                {
                    "id": "apt-invalid-1",
                    "checkedInAt": "2026-11-04T10:30:00Z",
                    "consultationStartedAt": "2026-11-04T10:15:00Z", # Started BEFORE check-in!
                }
            ],
            "attendances": [],
            "doctors": []
        }
        res = await ac.post("/data-quality/audit", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        model_res = data["models"]["patient_waiting_time"]
        assert model_res["invalid_timestamps_count"] == 1

@pytest.mark.asyncio
async def test_retrain_rejects_insufficient_production_data(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "model_name": "all",
            "force_synthetic_benchmark": False,
            "data_payload": {"appointments": [], "attendances": []}
        }
        res = await ac.post("/data-quality/retrain", json=payload, headers=auth_headers)
        assert res.status_code == 400
        assert "INSUFFICIENT_DATA" in res.json()["detail"]

@pytest.mark.asyncio
async def test_retrain_synthetic_dev_benchmark_succeeds(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "model_name": "all",
            "force_synthetic_benchmark": True
        }
        res = await ac.post("/data-quality/retrain", json=payload, headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data_source_used"] == "SYNTHETIC_DEVELOPMENT_PIPELINE"
        assert "evaluation_summary" in data

