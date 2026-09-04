from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200


def test_get_existing_customer() -> None:
    response = client.get("/customers/CUST-001")

    assert response.status_code == 200


def test_get_missing_customer() -> None:
    response = client.get("/customers/CUST-999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Customer not found"}


def test_get_existing_order() -> None:
    response = client.get("/orders/ORD-1001")

    assert response.status_code == 200


def test_get_missing_order() -> None:
    response = client.get("/orders/ORD-9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Order not found"}
