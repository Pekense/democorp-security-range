from pydantic import BaseModel


class Customer(BaseModel):
    customer_id: str
    name: str
    email: str
    status: str


class Order(BaseModel):
    order_id: str
    customer_id: str
    product_name: str
    amount: float
    currency: str
    status: str