"""
Test ML Service Health Endpoint
"""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "models_loaded" in data
        assert data["service"] == "MediFlow AI ML Service"
        assert data["models_loaded"]["waiting_time"] is True

