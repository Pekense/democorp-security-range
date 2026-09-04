import os
from typing import Any

from mcp import Client

from app.models import DiscoveredTool


MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://mcp-server:8001/mcp")


class MCPClientError(Exception):
    """A safe, consumer-facing MCP failure."""


class MCPGateway:
    def __init__(self, server_url: str = MCP_SERVER_URL) -> None:
        self.server_url = server_url
        self._client: Client | None = None

    async def __aenter__(self) -> "MCPGateway":
        self._client = Client(self.server_url)
        try:
            await self._client.__aenter__()
        except Exception as exc:
            self._client = None
            raise MCPClientError("MCP Server is unavailable") from exc
        return self

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        if self._client is not None:
            await self._client.__aexit__(exc_type, exc, traceback)
            self._client = None

    async def list_tools(self) -> list[DiscoveredTool]:
        client = self._connected_client()
        try:
            result = await client.list_tools()
        except Exception as exc:
            raise MCPClientError("MCP tool discovery failed") from exc

        return [
            DiscoveredTool(
                name=tool.name,
                description=tool.description or "",
                input_schema=tool.input_schema,
            )
            for tool in result.tools
        ]

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        client = self._connected_client()
        try:
            result = await client.call_tool(name, arguments)
        except Exception as exc:
            raise MCPClientError("MCP tool execution failed") from exc

        if result.is_error:
            return {"status": "TOOL_ERROR", "message": "MCP tool returned an error"}
        if result.structured_content is not None:
            return result.structured_content

        return {
            "status": "OK",
            "content": [item.model_dump(mode="json") for item in result.content],
        }

    def _connected_client(self) -> Client:
        if self._client is None:
            raise MCPClientError("MCP client is not connected")
        return self._client
