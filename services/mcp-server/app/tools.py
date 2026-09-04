from uuid import uuid4

from mcp.server import MCPServer
from mcp.types import ToolAnnotations

from app.backend_client import BackendClient, BackendClientError
from app.models import LookupResult, SimulatedTransferResult, TOOL_METADATA


backend_client = BackendClient()


def _correlation_ids(
    request_id: str | None,
    trace_id: str | None,
) -> tuple[str, str]:
    return request_id or str(uuid4()), trace_id or str(uuid4())


def _tool_meta(name: str) -> dict:
    return {"democorp/toolMetadata": TOOL_METADATA[name].model_dump()}


async def crm_lookup(
    customer_id: str,
    request_id: str | None = None,
    trace_id: str | None = None,
) -> LookupResult:
    resolved_request_id, resolved_trace_id = _correlation_ids(request_id, trace_id)

    try:
        customer = await backend_client.get_customer(
            customer_id,
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
        )
    except BackendClientError as exc:
        return LookupResult(
            status="BACKEND_ERROR",
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
            message=str(exc),
        )

    if customer is None:
        return LookupResult(
            status="NOT_FOUND",
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
            message="Customer not found",
        )

    return LookupResult(
        status="OK",
        request_id=resolved_request_id,
        trace_id=resolved_trace_id,
        data=customer.model_dump(),
    )


async def get_order(
    order_id: str,
    request_id: str | None = None,
    trace_id: str | None = None,
) -> LookupResult:
    resolved_request_id, resolved_trace_id = _correlation_ids(request_id, trace_id)

    try:
        order = await backend_client.get_order(
            order_id,
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
        )
    except BackendClientError as exc:
        return LookupResult(
            status="BACKEND_ERROR",
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
            message=str(exc),
        )

    if order is None:
        return LookupResult(
            status="NOT_FOUND",
            request_id=resolved_request_id,
            trace_id=resolved_trace_id,
            message="Order not found",
        )

    return LookupResult(
        status="OK",
        request_id=resolved_request_id,
        trace_id=resolved_trace_id,
        data=order.model_dump(),
    )


async def transfer_funds_simulated(
    source_account_id: str,
    destination_account_id: str,
    amount: float,
    currency: str,
    request_id: str | None = None,
    trace_id: str | None = None,
) -> SimulatedTransferResult:
    resolved_request_id, resolved_trace_id = _correlation_ids(request_id, trace_id)

    return SimulatedTransferResult(
        request_id=resolved_request_id,
        trace_id=resolved_trace_id,
        source_account_id=source_account_id,
        destination_account_id=destination_account_id,
        amount=amount,
        currency=currency,
        message="Simulation only; no funds were moved and no external service was contacted.",
    )


def register_tools(mcp: MCPServer) -> None:
    mcp.add_tool(
        crm_lookup,
        description=TOOL_METADATA["crm_lookup"].description,
        annotations=ToolAnnotations(read_only_hint=True, open_world_hint=False),
        meta=_tool_meta("crm_lookup"),
    )
    mcp.add_tool(
        get_order,
        description=TOOL_METADATA["get_order"].description,
        annotations=ToolAnnotations(read_only_hint=True, open_world_hint=False),
        meta=_tool_meta("get_order"),
    )
    mcp.add_tool(
        transfer_funds_simulated,
        description=TOOL_METADATA["transfer_funds_simulated"].description,
        annotations=ToolAnnotations(
            read_only_hint=False,
            destructive_hint=True,
            idempotent_hint=False,
            open_world_hint=False,
        ),
        meta=_tool_meta("transfer_funds_simulated"),
    )
