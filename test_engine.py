"""
Darkhold Exchange — Go Matching Engine & Collar Validation Tests
Tests the REST endpoints for operational status, collar enforcement, and FIFO ingestion.
"""

import pytest
import requests

BASE_URL = "http://localhost:8080"

@pytest.fixture(scope="session")
def check_server():
    """Ensure the Go server is running before executing tests."""
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=2)
        if r.status_code != 200:
            pytest.skip("Go backend is not reachable at localhost:8080. Start with: cd backend && go run cmd/server/main.go")
    except requests.exceptions.ConnectionError:
        pytest.skip("Go backend is not reachable at localhost:8080. Start with: cd backend && go run cmd/server/main.go")

def test_engine_health(check_server):
    """Verify health endpoint returns operational status and sub-10ms benchmark telemetry."""
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert data["matching_engine"] == "Go In-Memory FIFO"
    assert "< 4.2ms" in data["latency_benchmark"]

def test_compliant_order_accepted(check_server):
    """Verify an order priced within the +25% collar ceiling is accepted into the FIFO queue."""
    order = {
        "market_id": "darkhold-relic-001",
        "user_id": "buyer-test-01",
        "type": "LIMIT",
        "side": "BUY",
        "price": 120.0,
        "face_value": 100.0,
        "quantity": 1
    }
    res = requests.post(f"{BASE_URL}/api/orders", json=order)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ACCEPTED_INTO_FIFO_BOOK"
    assert body["order"]["price"] == 120.0

def test_scalper_collar_breach_rejected(check_server):
    """Verify an order priced above +25% markup is rejected with HTTP 422 COLLAR_BREACH."""
    order = {
        "market_id": "darkhold-relic-001",
        "user_id": "scalper-bot-01",
        "type": "LIMIT",
        "side": "SELL",
        "price": 250.0,  # +150% markup -> must be dropped
        "face_value": 100.0,
        "quantity": 5
    }
    res = requests.post(f"{BASE_URL}/api/orders", json=order)
    assert res.status_code == 422
    body = res.json()
    assert body["code"] == "422_COLLAR_BREACH"
    assert "COLLAR_BREACH" in body["error"]
