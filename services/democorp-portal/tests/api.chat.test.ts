import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatResponse } from "@/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function chatRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("proxies a chat request to the Finance Agent and returns its response", async () => {
    const mockResponse: ChatResponse = {
      response: "Customer found.",
      request_id: "req-1",
      trace_id: "trace-1",
      tools_used: ["crm_lookup"],
      tool_data: [{ tool_name: "crm_lookup", result: { status: "OK", data: { customer_id: "CUST-001" } } }],
      confirmation_required: false,
      confirmation_id: null,
      security_variant: "safe",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(chatRequest({ message: "Consulta el cliente CUST-001" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/chat");
  });

  it("passes confirmation_required through untouched", async () => {
    const mockResponse: ChatResponse = {
      response: "Human confirmation is required before executing this action.",
      request_id: "req-2",
      trace_id: "trace-2",
      tools_used: [],
      tool_data: [],
      confirmation_required: true,
      confirmation_id: "conf-123",
      security_variant: "safe",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(mockResponse)));

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(chatRequest({ message: "Simula una transferencia de 100 EUR" }));
    const body = await response.json();

    expect(body.confirmation_required).toBe(true);
    expect(body.confirmation_id).toBe("conf-123");
  });

  it("rejects an empty message without calling the Finance Agent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(chatRequest({ message: "   " }));

    expect(response.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the Finance Agent is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(chatRequest({ message: "Consulta el cliente CUST-001" }));

    expect(response.status).toBe(503);
  });
});
