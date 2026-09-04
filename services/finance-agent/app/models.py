from typing import Any

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str

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


class DiscoveredTool(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any]

    def as_ollama_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }
