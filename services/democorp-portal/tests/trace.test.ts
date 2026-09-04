import { describe, expect, it } from "vitest";

import { buildTracePath, traceStatus } from "@/lib/trace";
import type { ChatResponse } from "@/types";

function baseResponse(overrides: Partial<ChatResponse>): ChatResponse {
  return {
    response: "ok",
    request_id: "req-1",
    trace_id: "trace-1",
    tools_used: [],
    tool_data: [],
    confirmation_required: false,
    confirmation_id: null,
    security_variant: "safe",
    ...overrides,
  };
}

describe("traceStatus", () => {
  it("reports CONFIRMATION_REQUIRED when the agent blocked on human confirmation", () => {
    const response = baseResponse({ confirmation_required: true, confirmation_id: "conf-1" });
    expect(traceStatus(response)).toBe("CONFIRMATION_REQUIRED");
  });

  it("reports SIMULATED_TRANSFER when a tool result carries that status", () => {
    const response = baseResponse({
      tools_used: ["transfer_funds_simulated"],
      tool_data: [{ tool_name: "transfer_funds_simulated", result: { status: "SIMULATED_TRANSFER" } }],
    });
    expect(traceStatus(response)).toBe("SIMULATED_TRANSFER");
  });

  it("reports EXECUTED for a plain read-only tool call", () => {
    const response = baseResponse({
      tools_used: ["crm_lookup"],
      tool_data: [{ tool_name: "crm_lookup", result: { status: "OK" } }],
    });
    expect(traceStatus(response)).toBe("EXECUTED");
  });

  it("reports REQUESTED when no tool was used", () => {
    expect(traceStatus(baseResponse({}))).toBe("REQUESTED");
  });
});

describe("buildTracePath", () => {
  it("stops at the blocked step when confirmation is required", () => {
    const response = baseResponse({ confirmation_required: true, confirmation_id: "conf-1" });
    const steps = buildTracePath(response);
    expect(steps.at(-1)).toEqual({ label: "Awaiting Human Confirmation", status: "blocked" });
  });

  it("omits the Backend API hop for the simulated transfer tool", () => {
    const response = baseResponse({ tools_used: ["transfer_funds_simulated"] });
    const steps = buildTracePath(response);
    expect(steps.some((step) => step.label === "BACKEND API")).toBe(false);
    expect(steps.some((step) => step.label.includes("transfer_funds_simulated"))).toBe(true);
  });

  it("includes the Backend API hop for read-only lookups", () => {
    const response = baseResponse({ tools_used: ["crm_lookup"] });
    const steps = buildTracePath(response);
    expect(steps.some((step) => step.label === "BACKEND API")).toBe(true);
  });
});
