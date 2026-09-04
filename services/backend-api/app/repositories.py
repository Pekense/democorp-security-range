import json
from pathlib import Path

from app.models import Customer, Order


CUSTOMERS_DATA_FILE = Path("/data/customers/customers.json")
ORDERS_DATA_FILE = Path("/data/orders/orders.json")


def load_customers() -> list[dict]:
    """
    Load DemoCorp customer records from the local JSON dataset.
    """
    with CUSTOMERS_DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_orders() -> list[dict]:
    """
    Load DemoCorp order records from the local JSON dataset.
    """
    with ORDERS_DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def find_customer_by_id(customer_id: str) -> Customer | None:
    """
    Find and validate a customer by its DemoCorp identifier.
    """
    for customer in load_customers():
        if customer["customer_id"] == customer_id:
            return Customer(**customer)

    return None


def find_order_by_id(order_id: str) -> Order | None:
    """
    Find and validate an order by its DemoCorp identifier.
    """
    for order in load_orders():
        if order["order_id"] == order_id:
            return Order(**order)

    return None