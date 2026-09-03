import json
from pathlib import Path
from fastapi import FastAPI, HTTPException

app = FastAPI(
    title="DemoCorp Backend API",
    version="0.1.0",
    description="Core business API for DemoCorp Enterprise Security Range.",
)

DATA_FILE = Path("/data/customers/customers.json")
ORDERS_DATA_FILE = Path("/data/orders/orders.json")


def load_customers() -> list[dict]:
    """
    Load DemoCorp customers from the local JSON dataset.
    """
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_orders() -> list[dict]:
    """
    Load DemoCorp orders from the local JSON dataset.
    """
    with ORDERS_DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "backend-api",
    }
@app.get("/customers/{customer_id}")
def get_customer(customer_id: str) -> dict:
    """
    Return a DemoCorp customer by ID.
    """
    customers = load_customers()

    for customer in customers:
        if customer["customer_id"] == customer_id:
            return customer

    raise HTTPException(
        status_code=404,
        detail="Customer not found",
    )


@app.get("/orders/{order_id}")
def get_order(order_id: str) -> dict:
    """
    Return a DemoCorp order by ID.
    """
    orders = load_orders()

    for order in orders:
        if order["order_id"] == order_id:
            return order

    raise HTTPException(
        status_code=404,
        detail="Order not found",
    )
