import json
import logging
import os
from collections.abc import Callable
from typing import Any

from app.llm_client import OllamaClient
from app.mcp_client import MCPGateway
from app.models import ChatResponse, ToolData


MAX_TOOL_CALLS = int(os.getenv("MAX_TOOL_CALLS", "3"))
SYSTEM_MESSAGE = (
    "You are DemoCorp's Finance Agent. Use only the tools provided when business data or "
    "a simulated transfer is requested. Never claim that a simulated transfer moved real funds."
)

logger = logging.getLogger("democorp.finance_agent")


def log_event(event_type: str, request_id: str, trace_id: str, **fields: Any) -> None:
    payload = {
        "service": "finance-agent",
        "event_type": event_type,
        "request_id": request_id,
        "trace_id": trace_id,
        **fields,
    }
    logger.info(json.dumps(payload, sort_keys=True))


class FinanceAgent:
    def __init__(
        self,
        llm_client: OllamaClient | None = None,
        mcp_gateway_factory: Callable[[], MCPGateway] = MCPGateway,
        max_tool_calls: int = MAX_TOOL_CALLS,
    ) -> None:
        self.llm_client = llm_client or OllamaClient()
        self.mcp_gateway_factory = mcp_gateway_factory
        self.max_tool_calls = max_tool_calls

    async def run(self, message: str, request_id: str, trace_id: str) -> ChatResponse:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": message},
        ]
        tools_used: list[str] = []
        tool_data: list[ToolData] = []

        async with self.mcp_gateway_factory() as mcp_gateway:
            discovered_tools = await mcp_gateway.list_tools()
            allowed_tools = {tool.name for tool in discovered_tools}
            ollama_tools = [tool.as_ollama_tool() for tool in discovered_tools]

            while len(tools_used) < self.max_tool_calls:
                log_event("llm_request", request_id, trace_id)
                assistant_message = await self.llm_client.chat(messages, ollama_tools)
                messages.append(assistant_message)
                tool_calls = assistant_message.get("tool_calls") or []

                if not tool_calls:
                    response = assistant_message.get("content") or "Request completed."
                    return self._completed(
                        response,
                        request_id,
                        trace_id,
                        tools_used,
                        tool_data,
                    )

                for tool_call in tool_calls:
                    if len(tools_used) >= self.max_tool_calls:
                        break

                    function = tool_call.get("function", {})
                    tool_name = function.get("name")
                    arguments = function.get("arguments", {})

                    if tool_name not in allowed_tools or not isinstance(arguments, dict):
                        messages.append(
                            {
                                "role": "tool",
                                "tool_name": tool_name or "unknown",
                                "content": json.dumps({"status": "TOOL_REJECTED"}),
                            }
                        )
                        continue

                    arguments["request_id"] = request_id
                    arguments["trace_id"] = trace_id
                    log_event("tool_request", request_id, trace_id, tool_name=tool_name)
                    result = await mcp_gateway.call_tool(tool_name, arguments)
                    tools_used.append(tool_name)
                    tool_data.append(ToolData(tool_name=tool_name, result=result))
                    log_event(
                        "tool_result",
                        request_id,
                        trace_id,
                        tool_name=tool_name,
                        result_status=result.get("status", "UNKNOWN"),
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_name": tool_name,
                            "content": json.dumps(result),
                        }
                    )

            log_event("llm_request", request_id, trace_id)
            final_message = await self.llm_client.chat(messages, [])
            response = final_message.get("content") or "Tool call limit reached."
            return self._completed(response, request_id, trace_id, tools_used, tool_data)

    @staticmethod
    def _completed(
        response: str,
        request_id: str,
        trace_id: str,
        tools_used: list[str],
        tool_data: list[ToolData],
    ) -> ChatResponse:
        log_event("request_completed", request_id, trace_id, result_status="OK")
        return ChatResponse(
            response=response,
            request_id=request_id,
            trace_id=trace_id,
            tools_used=tools_used,
            tool_data=tool_data,
        )
