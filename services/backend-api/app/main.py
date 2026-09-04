from fastapi import FastAPI, HTTPException

from app.models import Customer, Order
from app.repositories import find_customer_by_id, find_order_by_id

app = FastAPI(
    title="DemoCorp Backend API",
    version="0.1.0",
    description="Core business API for DemoCorp Enterprise Security Range.",
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "backend-api",
    }


@app.get("/customers/{customer_id}", response_model=Customer)
def get_customer(customer_id: str) -> Customer:
    customer = find_customer_by_id(customer_id)

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return customer


@app.get("/orders/{order_id}", response_model=Order)
def get_order(order_id: str) -> Order:
    order = find_order_by_id(order_id)

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order
