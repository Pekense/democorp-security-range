import { describe, expect, it } from "vitest";

import { toolResultEntries, toolResultStatus } from "@/lib/format";

describe("toolResultEntries", () => {
  it("flattens a nested lookup result's data payload", () => {
    const result = {
      status: "OK",
      request_id: "req-1",
      trace_id: "trace-1",
      data: { customer_id: "CUST-001", name: "Alice Romero", status: "active" },
    };

    const entries = toolResultEntries(result);

    expect(entries).toEqual([
      { key: "customer_id", value: "CUST-001" },
      { key: "name", value: "Alice Romero" },
      { key: "status", value: "active" },
    ]);
  });

  it("falls back to top-level fields when there is no nested data payload", () => {
    const result = {
      status: "SIMULATED_TRANSFER",
      request_id: "req-2",
      trace_id: "trace-2",
      source_account_id: "ACC-001",
      destination_account_id: "ACC-002",
      amount: 100,
      currency: "EUR",
      message: "Simulation only.",
    };

    const entries = toolResultEntries(result);

    expect(entries).toContainEqual({ key: "source_account_id", value: "ACC-001" });
    expect(entries).toContainEqual({ key: "amount", value: "100" });
    expect(entries.some((entry) => entry.key === "request_id")).toBe(false);
    expect(entries.some((entry) => entry.key === "status")).toBe(false);
  });
});

describe("toolResultStatus", () => {
  it("reads the status field when present", () => {
    expect(toolResultStatus({ status: "OK" })).toBe("OK");
  });

  it("returns null when status is missing", () => {
    expect(toolResultStatus({})).toBeNull();
  });
});
