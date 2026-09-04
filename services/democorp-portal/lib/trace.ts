import type { ChatResponse } from "@/types";

export type TraceStatus = "REQUESTED" | "EXECUTED" | "CONFIRMATION_REQUIRED" | "SIMULATED_TRANSFER";

export interface TraceStep {
  label: string;
  status: "completed" | "blocked";
}

export function traceStatus(response: ChatResponse): TraceStatus {
  if (response.confirmation_required) {
    return "CONFIRMATION_REQUIRED";
  }
  const simulatedTransfer = response.tool_data.some((entry) => entry.result?.status === "SIMULATED_TRANSFER");
  if (simulatedTransfer) {
    return "SIMULATED_TRANSFER";
  }
  if (response.tools_used.length > 0) {
    return "EXECUTED";
  }
  return "REQUESTED";
}

/**
 * Builds the request path for display. Only reflects steps the runtime
 * actually confirmed through tools_used / confirmation_required — the
 * backend hop is omitted for transfer_funds_simulated because that tool
 * never calls the Backend API (it is purely simulated in the MCP Server).
 */
export function buildTracePath(response: ChatResponse): TraceStep[] {
  const steps: TraceStep[] = [
    { label: "USER", status: "completed" },
    { label: "FINANCE AGENT", status: "completed" },
    { label: "QWEN (LLM)", status: "completed" },
  ];

  if (response.confirmation_required) {
    steps.push({ label: "Awaiting Human Confirmation", status: "blocked" });
    return steps;
  }

  if (response.tools_used.length === 0) {
    steps.push({ label: "FINANCE AGENT (response)", status: "completed" });
    return steps;
  }

  for (const toolName of response.tools_used) {
    steps.push({ label: `MCP TOOL: ${toolName}`, status: "completed" });
    steps.push({ label: "MCP SERVER", status: "completed" });
    if (toolName !== "transfer_funds_simulated") {
      steps.push({ label: "BACKEND API", status: "completed" });
    }
  }

  return steps;
}
