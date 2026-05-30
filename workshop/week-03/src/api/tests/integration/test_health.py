"""Integration test for /api/health."""
import pytest
from fastapi.testclient import TestClient


pytestmark = pytest.mark.integration


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
