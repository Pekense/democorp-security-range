from typing import Any, Literal

from pydantic import BaseModel, Field


class ToolMetadata(BaseModel):
    name: str
    classification: Literal["READ_ONLY", "PRIVILEGED"]
    read_only: bool
    dangerous_capability: bool
    requires_human_confirmation: bool
    description: str


class CustomerData(BaseModel):
    customer_id: str
    name: str
    email: str
    status: str


class OrderData(BaseModel):
    order_id: str
    customer_id: str
    product_name: str
    amount: float
    currency: str
    status: str


class LookupResult(BaseModel):
    status: Literal["OK", "NOT_FOUND", "BACKEND_ERROR"]
    request_id: str
    trace_id: str
    data: dict[str, Any] | None = None
    message: str | None = None


class SimulatedTransferResult(BaseModel):
    status: Literal["SIMULATED_TRANSFER"] = "SIMULATED_TRANSFER"
    request_id: str
    trace_id: str
    source_account_id: str
    destination_account_id: str
    amount: float = Field(gt=0)
    currency: str
    message: str


TOOL_METADATA = {
    "crm_lookup": ToolMetadata(
        name="crm_lookup",
        classification="READ_ONLY",
        read_only=True,
        dangerous_capability=False,
        requires_human_confirmation=False,
        description="Look up a DemoCorp customer through the Backend API.",
    ),
    "get_order": ToolMetadata(
        name="get_order",
        classification="READ_ONLY",
        read_only=True,
        dangerous_capability=False,
        requires_human_confirmation=False,
        description="Look up a DemoCorp order through the Backend API.",
    ),
    "transfer_funds_simulated": ToolMetadata(
        name="transfer_funds_simulated",
        classification="PRIVILEGED",
        read_only=False,
        dangerous_capability=True,
        requires_human_confirmation=True,
        description="Simulate a funds transfer without changing state or contacting external services.",
    ),
}
