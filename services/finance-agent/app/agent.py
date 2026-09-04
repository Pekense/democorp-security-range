import json
import logging
import os
from collections.abc import Callable
from typing import Any

from app.llm_client import OllamaClient
from app.mcp_client import MCPGateway
from app.models import ChatResponse, ToolData
from app.policy import (
    ConfirmationStore,
    PolicyConfig,
    PolicyEnforcer,
    load_policy_from_environment,
)


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
        policy_config: PolicyConfig | None = None,
        confirmation_store: ConfirmationStore | None = None,
    ) -> None:
        self.llm_client = llm_client or OllamaClient()
        self.mcp_gateway_factory = mcp_gateway_factory
        self.max_tool_calls = max_tool_calls
        self.policy = PolicyEnforcer(policy_config or load_policy_from_environment())
        self.confirmation_store = confirmation_store or ConfirmationStore(
            self.policy.config.privileged_actions.confirmation_ttl_seconds
        )

    async def run(
        self,
        message: str,
        request_id: str,
        trace_id: str,
        confirmation_id: str | None = None,
    ) -> ChatResponse:
        if confirmation_id is not None:
            return await self._run_confirmation(confirmation_id, request_id, trace_id)

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": message},
        ]
        tools_used: list[str] = []
        tool_data: list[ToolData] = []

        async with self.mcp_gateway_factory() as mcp_gateway:
            discovered_tools = await mcp_gateway.list_tools()
            allowed_tools = {tool.name for tool in discovered_tools}
            tools_by_name = {tool.name: tool for tool in discovered_tools}
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
                    tool = tools_by_name[tool_name]
                    confirmation_required = self.policy.requires_confirmation(tool)
                    log_event(
                        "policy_decision",
                        request_id,
                        trace_id,
                        tool_name=tool_name,
                        tool_classification=tool.classification,
                        policy_variant=self.policy.security_variant,
                        confirmation_state=(
                            "REQUIRED" if confirmation_required else "NOT_REQUIRED"
                        ),
                        result_status=(
                            "CONFIRMATION_REQUIRED" if confirmation_required else "ALLOWED"
                        ),
                    )

                    if confirmation_required:
                        confirmation = await self.confirmation_store.create(
                            request_id=request_id,
                            trace_id=trace_id,
                            tool_name=tool_name,
                            tool_arguments=arguments,
                            user_message=message,
                        )
                        log_event(
                            "human_confirmation_requested",
                            request_id,
                            trace_id,
                            tool_name=tool_name,
                            tool_classification=tool.classification,
                            policy_variant=self.policy.security_variant,
                            confirmation_state="PENDING",
                            result_status="BLOCKED",
                        )
                        return ChatResponse(
                            response="Human confirmation is required before executing this action.",
                            request_id=request_id,
                            trace_id=trace_id,
                            tools_used=[],
                            tool_data=[],
                            confirmation_required=True,
                            confirmation_id=confirmation.confirmation_id,
                            security_variant=self.policy.security_variant,
                        )

                    log_event(
                        "tool_execution",
                        request_id,
                        trace_id,
                        tool_name=tool_name,
                        tool_classification=tool.classification,
                        policy_variant=self.policy.security_variant,
                        confirmation_state="NOT_REQUIRED",
                        result_status="STARTED",
                    )
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

    async def _run_confirmation(
        self,
        confirmation_id: str,
        request_id: str,
        trace_id: str,
    ) -> ChatResponse:
        confirmation = await self.confirmation_store.consume(confirmation_id)
        if confirmation is None:
            log_event(
                "human_confirmation_received",
                request_id,
                trace_id,
                tool_name=None,
                tool_classification="UNKNOWN",
                policy_variant=self.policy.security_variant,
                confirmation_state="INVALID_OR_EXPIRED",
                result_status="BLOCKED",
            )
            return ChatResponse(
                response="The confirmation is invalid, expired, or has already been used.",
                request_id=request_id,
                trace_id=trace_id,
                tools_used=[],
                tool_data=[],
                confirmation_required=True,
                confirmation_id=None,
                security_variant=self.policy.security_variant,
            )

        request_id = confirmation.request_id
        trace_id = confirmation.trace_id

        async with self.mcp_gateway_factory() as mcp_gateway:
            discovered_tools = await mcp_gateway.list_tools()
            tool = next(
                (item for item in discovered_tools if item.name == confirmation.tool_name),
                None,
            )
            if tool is None or tool.classification != "PRIVILEGED":
                log_event(
                    "policy_decision",
                    request_id,
                    trace_id,
                    tool_name=confirmation.tool_name,
                    tool_classification=(tool.classification if tool else "UNKNOWN"),
                    policy_variant=self.policy.security_variant,
                    confirmation_state="CONFIRMED",
                    result_status="BLOCKED",
                )
                return ChatResponse(
                    response="The confirmed operation is no longer available.",
                    request_id=request_id,
                    trace_id=trace_id,
                    tools_used=[],
                    tool_data=[],
                    confirmation_required=False,
                    confirmation_id=None,
                    security_variant=self.policy.security_variant,
                )

            log_event(
                "human_confirmation_received",
                request_id,
                trace_id,
                tool_name=confirmation.tool_name,
                tool_classification=tool.classification,
                policy_variant=self.policy.security_variant,
                confirmation_state="CONFIRMED",
                result_status="ALLOWED",
            )
            log_event(
                "tool_execution",
                request_id,
                trace_id,
                tool_name=confirmation.tool_name,
                tool_classification=tool.classification,
                policy_variant=self.policy.security_variant,
                confirmation_state="CONFIRMED",
                result_status="STARTED",
            )
            result = await mcp_gateway.call_tool(
                confirmation.tool_name,
                confirmation.tool_arguments,
            )

        messages = [
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": confirmation.user_message},
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {
                        "function": {
                            "name": confirmation.tool_name,
                            "arguments": confirmation.tool_arguments,
                        }
                    }
                ],
            },
            {
                "role": "tool",
                "tool_name": confirmation.tool_name,
                "content": json.dumps(result),
            },
        ]
        log_event("llm_request", request_id, trace_id)
        final_message = await self.llm_client.chat(messages, [])
        response = final_message.get("content") or "Confirmed action completed."
        return self._completed(
            response,
            request_id,
            trace_id,
            [confirmation.tool_name],
            [ToolData(tool_name=confirmation.tool_name, result=result)],
        )

    def _completed(
        self,
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
            confirmation_required=False,
            confirmation_id=None,
            security_variant=self.policy.security_variant,
        )
