"use client";

import { traceStatus } from "@/lib/trace";
import { useTrace } from "@/lib/trace-context";

import { TraceStatusBadge } from "./StatusBadge";

export function LastActivityCard() {
  const { latest } = useTrace();

  if (!latest) {
    return (
      <div className="card">
        <div className="cardHeader">
          <span className="cardTitle">Last Activity</span>
        </div>
        <p className="textMuted">No Finance Agent interactions yet in this browser.</p>
      </div>
    );
  }

  const { response } = latest;
  const lastTool = response.tools_used.at(-1) ?? null;
  const lastResultStatus = response.tool_data.at(-1)?.result.status;

  return (
    <div className="card">
      <div className="cardHeader">
        <span className="cardTitle">Last Activity</span>
        <TraceStatusBadge status={traceStatus(response)} />
      </div>
      <div className="kvList">
        <div className="kvRow">
          <span className="kvKey">Last Tool</span>
          <span className="kvValue mono">{lastTool ?? "—"}</span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Trace ID</span>
          <span className="kvValue mono">{latest.trace_id}</span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Last Result</span>
          <span className="kvValue">{typeof lastResultStatus === "string" ? lastResultStatus : "—"}</span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Confirmation</span>
          <span className="kvValue">{response.confirmation_required ? "Required" : "Not required"}</span>
        </div>
      </div>
    </div>
  );
}
