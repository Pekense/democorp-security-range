"use client";

import { useState } from "react";

import { SecurityVariantBadge, TraceStatusBadge } from "@/components/StatusBadge";
import { TraceTimeline } from "@/components/TraceTimeline";
import { formatTimestamp } from "@/lib/format";
import { buildTracePath, traceStatus } from "@/lib/trace";
import { useTrace } from "@/lib/trace-context";

import styles from "./page.module.css";

export default function TraceExplorerPage() {
  const { records, clear } = useTrace();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const selected = records.find((record) => record.request_id === selectedRequestId) ?? records[0] ?? null;

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">Trace Explorer</h1>
        <p className="pageSubtitle">
          Built from the Finance Agent&apos;s own <code className="mono">/chat</code> responses — nothing here is
          inferred beyond what the runtime returned.
        </p>
      </div>

      {!selected ? (
        <div className="card">
          <div className={styles.empty}>
            No interactions yet. Send a message from Finance Agent to populate the trace.
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="cardHeader">
              <span className="cardTitle">Selected Interaction</span>
              <TraceStatusBadge status={traceStatus(selected.response)} />
            </div>

            <div className="kvList" style={{ marginBottom: 16 }}>
              <div className="kvRow">
                <span className="kvKey">User Message</span>
                <span className="kvValue">{selected.user_message}</span>
              </div>
              <div className="kvRow">
                <span className="kvKey">Request ID</span>
                <span className="kvValue mono">{selected.request_id}</span>
              </div>
              <div className="kvRow">
                <span className="kvKey">Trace ID</span>
                <span className="kvValue mono">{selected.trace_id}</span>
              </div>
              <div className="kvRow">
                <span className="kvKey">Security Variant</span>
                <span className="kvValue">
                  <SecurityVariantBadge variant={selected.response.security_variant} />
                </span>
              </div>
              <div className="kvRow">
                <span className="kvKey">Timestamp</span>
                <span className="kvValue">{formatTimestamp(selected.timestamp)}</span>
              </div>
            </div>

            <hr className="divider" />

            <span className="cardTitle" style={{ display: "block", marginBottom: 8 }}>
              Request Path
            </span>
            <TraceTimeline steps={buildTracePath(selected.response)} />
          </div>

          <div className="card">
            <div className="cardHeader">
              <span className="cardTitle">Recent Interactions</span>
              <button type="button" className="button buttonGhost" onClick={clear}>
                Clear History
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Message</th>
                    <th>Tool</th>
                    <th>Status</th>
                    <th>Trace ID</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={`${record.request_id}-${index}`}
                      className={record.request_id === selected?.request_id ? styles.historyRowActive : styles.historyRow}
                      onClick={() => setSelectedRequestId(record.request_id)}
                    >
                      <td className="textMuted">{formatTimestamp(record.timestamp)}</td>
                      <td>{record.user_message}</td>
                      <td className="mono">{record.response.tools_used.join(", ") || "—"}</td>
                      <td>
                        <TraceStatusBadge status={traceStatus(record.response)} />
                      </td>
                      <td className="mono textMuted">{record.trace_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
