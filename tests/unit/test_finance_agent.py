import asyncio
from typing import Any

from fastapi.testclient import TestClient

from app.agent import FinanceAgent
from app.main import app
from app.models import DiscoveredTool
from app.policy import PolicyConfig


client = TestClient(app)


class FakeLLMClient:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = responses
        self.requests: list[tuple[list[dict[str, Any]], list[dict[str, Any]]]] = []

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> dict[str, Any]:
        self.requests.append((messages.copy(), tools.copy()))
        return self.responses.pop(0)


class FakeMCPGateway:
    def __init__(
        self,
        tools: list[DiscoveredTool],
        result: dict[str, Any] | None = None,
    ) -> None:
        self.tools = tools
        self.result = result or {"status": "OK", "data": {}}
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def __aenter__(self) -> "FakeMCPGateway":
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        return None

    async def list_tools(self) -> list[DiscoveredTool]:
        return self.tools

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((name, arguments.copy()))
        return self.result


def discovered_tool(name: str) -> DiscoveredTool:
    privileged = name == "transfer_funds_simulated"
    return DiscoveredTool(
        name=name,
        description=f"DemoCorp {name} tool",
        input_schema={"type": "object", "properties": {}},
        classification="PRIVILEGED" if privileged else "READ_ONLY",
        requires_human_confirmation=privileged,
    )


def policy_config(variant: str = "vulnerable") -> PolicyConfig:
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


def tool_call(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        "role": "assistant",
        "content": "",
        "tool_calls": [{"function": {"name": name, "arguments": arguments}}],
    }


def run_tool_scenario(
    name: str,
    arguments: dict[str, Any],
    result: dict[str, Any] | None = None,
):
    llm = FakeLLMClient(
        [
            tool_call(name, arguments),
            {"role": "assistant", "content": f"Completed with {name}."},
        ]
    )
    gateway = FakeMCPGateway([discovered_tool(name)], result)
    agent = FinanceAgent(
        llm_client=llm,
        mcp_gateway_factory=lambda: gateway,
        max_tool_calls=3,
        policy_config=policy_config(),
    )

    response = asyncio.run(agent.run("test message", "request-test", "trace-test"))
    return response, gateway


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "finance-agent"}


def test_chat_rejects_empty_message() -> None:
    response = client.post("/chat", json={"message": "   "})

    assert response.status_code == 422


def test_selects_crm_lookup() -> None:
    customer = {
        "status": "OK",
        "data": {"customer_id": "CUST-001", "name": "Alice Romero"},
    }
    response, gateway = run_tool_scenario(
        "crm_lookup",
        {"customer_id": "CUST-001"},
        customer,
    )

    assert response.tools_used == ["crm_lookup"]
    assert response.tool_data[0].result == customer
    assert gateway.calls[0][0] == "crm_lookup"


def test_selects_get_order() -> None:
    order = {
        "status": "OK",
        "data": {
            "order_id": "ORD-1001",
            "amount": 2500.0,
            "currency": "EUR",
        },
    }
    response, gateway = run_tool_scenario(
        "get_order",
        {"order_id": "ORD-1001"},
        order,
    )

    assert response.tools_used == ["get_order"]
    assert response.tool_data[0].result["data"]["amount"] == 2500.0
    assert gateway.calls[0][0] == "get_order"


def test_selects_simulated_transfer() -> None:
    simulated_transfer = {"status": "SIMULATED_TRANSFER", "amount": 100.0}
    response, gateway = run_tool_scenario(
        "transfer_funds_simulated",
        {
            "source_account_id": "ACC-001",
            "destination_account_id": "ACC-002",
            "amount": 100,
            "currency": "EUR",
        },
        simulated_transfer,
    )

    assert response.tools_used == ["transfer_funds_simulated"]
    assert response.tool_data[0].result["status"] == "SIMULATED_TRANSFER"
    assert gateway.calls[0][0] == "transfer_funds_simulated"


def test_tool_data_is_empty_when_no_tool_is_used() -> None:
    llm = FakeLLMClient([{"role": "assistant", "content": "No tool needed."}])
    gateway = FakeMCPGateway([])
    agent = FinanceAgent(
        llm,
        lambda: gateway,
        max_tool_calls=3,
        policy_config=policy_config("safe"),
    )

    response = asyncio.run(agent.run("hello", "request-empty", "trace-empty"))

    assert response.tools_used == []
    assert response.tool_data == []


def test_limits_tool_calls() -> None:
    name = "crm_lookup"
    llm = FakeLLMClient(
        [
            tool_call(name, {"customer_id": "CUST-001"}),
            tool_call(name, {"customer_id": "CUST-001"}),
            tool_call(name, {"customer_id": "CUST-001"}),
            {"role": "assistant", "content": "Stopped after the configured limit."},
        ]
    )
    gateway = FakeMCPGateway([discovered_tool(name)])
    agent = FinanceAgent(
        llm,
        lambda: gateway,
        max_tool_calls=3,
        policy_config=policy_config(),
    )

    response = asyncio.run(agent.run("repeat", "request-limit", "trace-limit"))

    assert len(gateway.calls) == 3
    assert response.tools_used == [name, name, name]
    assert len(response.tool_data) == 3
    assert llm.requests[-1][1] == []


def test_propagates_request_and_trace_ids() -> None:
    response, gateway = run_tool_scenario("get_order", {"order_id": "ORD-1001"})
    arguments = gateway.calls[0][1]

    assert arguments["request_id"] == "request-test"
    assert arguments["trace_id"] == "trace-test"
    assert response.request_id == "request-test"
    assert response.trace_id == "trace-test"
