import { afterEach, describe, expect, it, vi } from "vitest";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("reports each service's real reachability instead of a static flag", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("finance-agent")) {
        throw new Error("connect ECONNREFUSED");
      }
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    const byId = Object.fromEntries(
      (body.services as { id: string; status: string }[]).map((service) => [service.id, service.status]),
    );

    expect(byId["backend-api"]).toBe("ONLINE");
    expect(byId["mcp-server"]).toBe("ONLINE");
    expect(byId["ollama"]).toBe("ONLINE");
    expect(byId["finance-agent"]).toBe("OFFLINE");
    expect(body.services).toHaveLength(4);
    expect(typeof body.checked_at).toBe("string");
  });
});
