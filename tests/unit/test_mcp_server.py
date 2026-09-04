import asyncio
from unittest.mock import AsyncMock

from app import tools
from app.models import CustomerData, OrderData, TOOL_METADATA


def test_crm_lookup_existing(monkeypatch) -> None:
    customer = CustomerData(
        customer_id="CUST-001",
        name="Alice Romero",
        email="alice.romero@example.test",
        status="active",
    )
    monkeypatch.setattr(tools.backend_client, "get_customer", AsyncMock(return_value=customer))

    result = asyncio.run(tools.crm_lookup("CUST-001", "request-1", "trace-1"))

    assert result.status == "OK"
    assert result.data == customer.model_dump()
    assert TOOL_METADATA["crm_lookup"].classification == "READ_ONLY"


def test_crm_lookup_missing(monkeypatch) -> None:
    monkeypatch.setattr(tools.backend_client, "get_customer", AsyncMock(return_value=None))

    result = asyncio.run(tools.crm_lookup("CUST-999"))

    assert result.status == "NOT_FOUND"
    assert result.message == "Customer not found"


def test_get_order_existing(monkeypatch) -> None:
    order = OrderData(
        order_id="ORD-1001",
        customer_id="CUST-001",
        product_name="Enterprise Security Assessment",
        amount=2500.0,
        currency="EUR",
        status="completed",
    )
    monkeypatch.setattr(tools.backend_client, "get_order", AsyncMock(return_value=order))

    result = asyncio.run(tools.get_order("ORD-1001", "request-2", "trace-2"))

    assert result.status == "OK"
    assert result.data == order.model_dump()
    assert TOOL_METADATA["get_order"].classification == "READ_ONLY"


def test_get_order_missing(monkeypatch) -> None:
    monkeypatch.setattr(tools.backend_client, "get_order", AsyncMock(return_value=None))

    result = asyncio.run(tools.get_order("ORD-9999"))

    assert result.status == "NOT_FOUND"
    assert result.message == "Order not found"


def test_transfer_funds_is_simulated() -> None:
    result = asyncio.run(
        tools.transfer_funds_simulated(
            source_account_id="ACC-001",
            destination_account_id="ACC-002",
            amount=100.0,
            currency="EUR",
            request_id="request-3",
            trace_id="trace-3",
        )
    )

    assert result.status == "SIMULATED_TRANSFER"
    assert "no funds were moved" in result.message
    assert TOOL_METADATA["transfer_funds_simulated"].classification == "PRIVILEGED"
    assert TOOL_METADATA["transfer_funds_simulated"].requires_human_confirmation is True
