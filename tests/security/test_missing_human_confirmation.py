import asyncio
from typing import Any

import pytest

from app.agent import FinanceAgent
from app.models import DiscoveredTool
from app.policy import ConfirmationStore, PolicyConfig


TRANSFER_RESULT = {
    "status": "SIMULATED_TRANSFER",
    "source_account_id": "ACC-001",
    "destination_account_id": "ACC-002",
    "amount": 100.0,
    "currency": "EUR",
}


class FakeLLMClient:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = responses

    async def chat(self, messages, tools) -> dict[str, Any]:
        return self.responses.pop(0)


class FakeMCPGateway:
    def __init__(self, tool: DiscoveredTool, result: dict[str, Any]) -> None:
        self.tool = tool
        self.result = result
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def __aenter__(self) -> "FakeMCPGateway":
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        return None

    async def list_tools(self) -> list[DiscoveredTool]:
        return [self.tool]

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((name, arguments.copy()))
        return self.result


def policy_config(variant: str) -> PolicyConfig:
    return PolicyConfig.model_validate(
        {
            "security_variant": variant,
            "policy_origin": {
                "vulnerable": "baseline_unenforced",
                "safe": "secure_by_design",
                "patched": "mitigation_applied",
            }[variant],
            "privileged_actions": {
                "require_human_confirmation": variant != "vulnerable",
                "confirmation_ttl_seconds": 300,
            },
        }
    )


def discovered_tool(name: str, classification: str) -> DiscoveredTool:
    return DiscoveredTool(
        name=name,
        description=name,
        input_schema={"type": "object", "properties": {}},
        classification=classification,
        requires_human_confirmation=classification == "PRIVILEGED",
    )


def tool_call(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": "assistant",
        "content": "",
        "tool_calls": [{"function": {"name": name, "arguments": arguments}}],
    }


def transfer_agent(
    variant: str,
    responses: list[dict[str, Any]],
    clock=None,
) -> tuple[FinanceAgent, FakeMCPGateway]:
    tool = discovered_tool("transfer_funds_simulated", "PRIVILEGED")
    gateway = FakeMCPGateway(tool, TRANSFER_RESULT)
    config = policy_config(variant)
    store = ConfirmationStore(300, clock=clock) if clock is not None else None
    agent = FinanceAgent(
        llm_client=FakeLLMClient(responses),
        mcp_gateway_factory=lambda: gateway,
        max_tool_calls=3,
        policy_config=config,
        confirmation_store=store,
    )
    return agent, gateway


def transfer_request() -> dict[str, Any]:
    return {
        "source_account_id": "ACC-001",
        "destination_account_id": "ACC-002",
        "amount": 100.0,
        "currency": "EUR",
    }


def test_vulnerable_executes_without_confirmation() -> None:
    agent, gateway = transfer_agent(
        "vulnerable",
        [
            tool_call("transfer_funds_simulated", transfer_request()),
            {"role": "assistant", "content": "Transfer simulated."},
        ],
    )

    response = asyncio.run(agent.run("simulate transfer", "request-1", "trace-1"))

    assert len(gateway.calls) == 1
    assert response.confirmation_required is False
    assert response.tool_data[0].result["status"] == "SIMULATED_TRANSFER"


def test_safe_blocks_without_confirmation() -> None:
    agent, gateway = transfer_agent(
        "safe",
        [tool_call("transfer_funds_simulated", transfer_request())],
    )

    response = asyncio.run(agent.run("simulate transfer", "request-2", "trace-2"))

    assert gateway.calls == []
    assert response.confirmation_required is True
    assert response.confirmation_id is not None
    assert response.tool_data == []


def test_safe_valid_confirmation_executes() -> None:
    async def scenario():
        agent, gateway = transfer_agent(
            "safe",
            [
                tool_call("transfer_funds_simulated", transfer_request()),
                {"role": "assistant", "content": "Confirmed transfer simulated."},
            ],
        )
        pending = await agent.run("simulate transfer", "request-3", "trace-3")
        confirmed = await agent.run(
            "confirm transfer",
            "new-request",
            "new-trace",
            confirmation_id=pending.confirmation_id,
        )
        return pending, confirmed, gateway

    pending, confirmed, gateway = asyncio.run(scenario())

    assert len(gateway.calls) == 1
    assert confirmed.confirmation_required is False
    assert confirmed.tool_data[0].result["status"] == "SIMULATED_TRANSFER"
    assert confirmed.request_id == pending.request_id
    assert confirmed.trace_id == pending.trace_id


def test_safe_invalid_confirmation_is_blocked() -> None:
    agent, gateway = transfer_agent("safe", [])

    response = asyncio.run(
        agent.run("confirm transfer", "request-4", "trace-4", "invalid-id")
    )

    assert gateway.calls == []
    assert response.confirmation_required is True
    assert response.tool_data == []


def test_safe_confirmation_cannot_be_reused() -> None:
    async def scenario():
        agent, gateway = transfer_agent(
            "safe",
            [
                tool_call("transfer_funds_simulated", transfer_request()),
                {"role": "assistant", "content": "Confirmed."},
            ],
        )
        pending = await agent.run("simulate transfer", "request-5", "trace-5")
        first = await agent.run("confirm", "new-1", "trace-new-1", pending.confirmation_id)
        second = await agent.run("confirm", "new-2", "trace-new-2", pending.confirmation_id)
        return first, second, gateway

    first, second, gateway = asyncio.run(scenario())

    assert first.tool_data[0].result["status"] == "SIMULATED_TRANSFER"
    assert second.tool_data == []
    assert second.confirmation_required is True
    assert len(gateway.calls) == 1


def test_safe_expired_confirmation_is_blocked() -> None:
    async def scenario():
        now = [1000.0]
        agent, gateway = transfer_agent(
            "safe",
            [tool_call("transfer_funds_simulated", transfer_request())],
            clock=lambda: now[0],
        )
        pending = await agent.run("simulate transfer", "request-6", "trace-6")
        now[0] += 301
        expired = await agent.run("confirm", "new-request", "new-trace", pending.confirmation_id)
        return expired, gateway

    expired, gateway = asyncio.run(scenario())

    assert expired.confirmation_required is True
    assert expired.tool_data == []
    assert gateway.calls == []


def test_patched_blocks_original_request() -> None:
    agent, gateway = transfer_agent(
        "patched",
        [tool_call("transfer_funds_simulated", transfer_request())],
    )

    response = asyncio.run(agent.run("simulate transfer", "request-7", "trace-7"))

    assert response.confirmation_required is True
    assert gateway.calls == []


def test_patched_valid_confirmation_executes() -> None:
    async def scenario():
        agent, gateway = transfer_agent(
            "patched",
            [
                tool_call("transfer_funds_simulated", transfer_request()),
                {"role": "assistant", "content": "Confirmed."},
            ],
        )
        pending = await agent.run("simulate transfer", "request-8", "trace-8")
        confirmed = await agent.run("confirm", "new", "new-trace", pending.confirmation_id)
        return confirmed, gateway

    confirmed, gateway = asyncio.run(scenario())

    assert confirmed.tool_data[0].result["status"] == "SIMULATED_TRANSFER"
    assert len(gateway.calls) == 1


@pytest.mark.parametrize("variant", ["vulnerable", "safe", "patched"])
@pytest.mark.parametrize("tool_name", ["crm_lookup", "get_order"])
def test_read_only_tools_never_require_confirmation(variant: str, tool_name: str) -> None:
    tool = discovered_tool(tool_name, "READ_ONLY")
    gateway = FakeMCPGateway(tool, {"status": "OK", "data": {"id": "demo"}})
    agent = FinanceAgent(
        llm_client=FakeLLMClient(
            [
                tool_call(tool_name, {"id": "demo"}),
                {"role": "assistant", "content": "Found."},
            ]
        ),
        mcp_gateway_factory=lambda: gateway,
        policy_config=policy_config(variant),
    )

    response = asyncio.run(agent.run("lookup", "request-ro", "trace-ro"))

    assert response.confirmation_required is False
    assert response.tools_used == [tool_name]
    assert len(gateway.calls) == 1
