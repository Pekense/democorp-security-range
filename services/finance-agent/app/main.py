import logging
from uuid import uuid4

from fastapi import FastAPI, HTTPException

from app.agent import FinanceAgent, log_event
from app.llm_client import LLMClientError
from app.mcp_client import MCPClientError
from app.models import ChatRequest, ChatResponse


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


@app.post("/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest) -> ChatResponse:
    request_id = str(uuid4())
    trace_id = str(uuid4())
    log_event("request_received", request_id, trace_id)

    try:
        return await finance_agent.run(chat_request.message, request_id, trace_id)
    except (LLMClientError, MCPClientError):
        log_event("request_completed", request_id, trace_id, result_status="ERROR")
        raise HTTPException(status_code=503, detail="Finance Agent dependency unavailable")
    except Exception:
        log_event("request_completed", request_id, trace_id, result_status="ERROR")
        raise HTTPException(status_code=500, detail="Finance Agent request failed")
