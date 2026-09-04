from mcp.server import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.tools import register_tools


mcp = MCPServer(
    "democorp-mcp-server",
    instructions="DemoCorp business tools backed exclusively by the internal Backend API.",
)
register_tools(mcp)


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "mcp-server"})


transport_security = TransportSecuritySettings(
    allowed_hosts=[
        "127.0.0.1:*",
        "localhost:*",
        "mcp-server:*",
    ],
    allowed_origins=[
        "http://127.0.0.1:*",
        "http://localhost:*",
    ],
)


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=8001,
        stateless_http=True,
        json_response=True,
        transport_security=transport_security,
    )
