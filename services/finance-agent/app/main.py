import logging
from uuid import uuid4

from fastapi import FastAPI, HTTPException

from app.agent import FinanceAgent, log_event
from app.llm_client import LLMClientError
from app.mcp_client import MCPClientError
from app.models import (
    ChatRequest,
    ChatResponse,
    PendingConfirmationInfo,
    SecurityVariantInfo,
    ToolSummary,
)


logging.basicConfig(level=logging.INFO, format="%(message)s")

app = FastAPI(
    title="DemoCorp Finance Agent",
    version="0.1.0",
    description="Local Finance AI Agent using Ollama and DemoCorp MCP tools.",
)
finance_agent = FinanceAgent()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "finance-agent"}


@app.get("/security-variant", response_model=SecurityVariantInfo)
def security_variant() -> SecurityVariantInfo:
    return SecurityVariantInfo(
        security_variant=finance_agent.policy.security_variant,
        policy_origin=finance_agent.policy.config.policy_origin,
    )


@app.get("/tools", response_model=list[ToolSummary])
async def list_tools() -> list[ToolSummary]:
    try:
        async with finance_agent.mcp_gateway_factory() as mcp_gateway:
            discovered_tools = await mcp_gateway.list_tools()
    except MCPClientError:
        raise HTTPException(status_code=503, detail="MCP Server unavailable")

    return [
        ToolSummary(
            name=tool.name,
            description=tool.description,
            classification=tool.classification,
            read_only=tool.read_only,
            dangerous_capability=tool.dangerous_capability,
            requires_human_confirmation=tool.requires_human_confirmation,
        )
        for tool in discovered_tools
    ]


@app.get("/confirmations/{confirmation_id}", response_model=PendingConfirmationInfo)
async def get_pending_confirmation(confirmation_id: str) -> PendingConfirmationInfo:
    confirmation = await finance_agent.confirmation_store.peek(confirmation_id)
    if confirmation is None:
        raise HTTPException(status_code=404, detail="Confirmation not found or no longer pending")

    return PendingConfirmationInfo(
        confirmation_id=confirmation.confirmation_id,
        tool_name=confirmation.tool_name,
        tool_arguments={
            key: value
            for key, value in confirmation.tool_arguments.items()
            if key not in {"request_id", "trace_id"}
        },
        security_variant=finance_agent.policy.security_variant,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest) -> ChatResponse:
    request_id = str(uuid4())
    trace_id = str(uuid4())
    log_event("request_received", request_id, trace_id)

    try:
        return await finance_agent.run(
            chat_request.message,
            request_id,
            trace_id,
            confirmation_id=chat_request.confirmation_id,
        )
    except (LLMClientError, MCPClientError):
        log_event("request_completed", request_id, trace_id, result_status="ERROR")
        raise HTTPException(status_code=503, detail="Finance Agent dependency unavailable")
    except Exception:
        log_event("request_completed", request_id, trace_id, result_status="ERROR")
        raise HTTPException(status_code=500, detail="Finance Agent request failed")
