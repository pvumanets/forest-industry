from fastapi.testclient import TestClient

from gp_api.main import app

client = TestClient(app)


def test_health_ok() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/json")
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "grove-pulse-api"
