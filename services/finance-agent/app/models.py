from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str
    confirmation_id: str | None = None

    @field_validator("message")
    @classmethod
    def message_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be empty")
        return value


class ToolData(BaseModel):
    tool_name: str
    result: dict[str, Any]


class ChatResponse(BaseModel):
    response: str
    request_id: str
    trace_id: str
    tools_used: list[str]
    tool_data: list[ToolData] = Field(default_factory=list)
    confirmation_required: bool = False
    confirmation_id: str | None = None
    security_variant: Literal["vulnerable", "safe", "patched"]


class DiscoveredTool(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any]
    classification: Literal["READ_ONLY", "PRIVILEGED"]
    requires_human_confirmation: bool
    read_only: bool = False
    dangerous_capability: bool = False

    def as_ollama_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


class ToolSummary(BaseModel):
    name: str
    description: str
    classification: Literal["READ_ONLY", "PRIVILEGED"]
    read_only: bool
    dangerous_capability: bool
    requires_human_confirmation: bool


class SecurityVariantInfo(BaseModel):
    security_variant: Literal["vulnerable", "safe", "patched"]
    policy_origin: Literal["baseline_unenforced", "secure_by_design", "mitigation_applied"]


class PendingConfirmationInfo(BaseModel):
    confirmation_id: str
    tool_name: str
    tool_arguments: dict[str, Any]
    security_variant: Literal["vulnerable", "safe", "patched"]
