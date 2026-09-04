export interface ToolResultEntry {
  key: string;
  value: string;
}

const HIDDEN_KEYS = new Set(["request_id", "trace_id", "status"]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Flattens a tool result into a display-friendly list of key/value rows,
 * preferring the nested `data` payload (used by the read-only lookups) and
 * falling back to top-level fields (used by the simulated transfer).
 */
export function toolResultEntries(result: Record<string, unknown>): ToolResultEntry[] {
  const hasData = result.data !== null && result.data !== undefined && typeof result.data === "object";
  const source = hasData ? (result.data as Record<string, unknown>) : result;
  // "status" inside a nested `data` payload is business data (e.g. a customer's
  // status), not the tool call's own envelope status, so only hide it at the
  // top level.
  const hiddenKeys = hasData ? new Set(["request_id", "trace_id"]) : HIDDEN_KEYS;

  return Object.entries(source)
    .filter(([key]) => !hiddenKeys.has(key))
    .map(([key, value]) => ({ key, value: formatValue(value) }));
}

export function toolResultStatus(result: Record<string, unknown>): string | null {
  const status = result.status;
  return typeof status === "string" ? status : null;
}

const PRIVILEGED_TOOLS = new Set(["transfer_funds_simulated"]);

export function isPrivilegedTool(toolName: string): boolean {
  return PRIVILEGED_TOOLS.has(toolName);
}

export function formatTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
