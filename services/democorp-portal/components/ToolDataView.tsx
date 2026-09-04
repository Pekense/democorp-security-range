"use client";

import { useState } from "react";

import { toolResultEntries, toolResultStatus } from "@/lib/format";
import type { ToolData } from "@/types";

import { ClassificationBadge } from "./StatusBadge";
import styles from "./ToolDataView.module.css";

const CLASSIFICATION_BY_TOOL: Record<string, "READ_ONLY" | "PRIVILEGED"> = {
  crm_lookup: "READ_ONLY",
  get_order: "READ_ONLY",
  transfer_funds_simulated: "PRIVILEGED",
};

export function ToolDataView({ toolData }: { toolData: ToolData }) {
  const [showRaw, setShowRaw] = useState(false);
  const entries = toolResultEntries(toolData.result);
  const status = toolResultStatus(toolData.result);
  const classification = CLASSIFICATION_BY_TOOL[toolData.tool_name];

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.toolName}>{toolData.tool_name}</span>
        {classification && <ClassificationBadge classification={classification} />}
        {status && <span className="badge badge-neutral">{status}</span>}
        <button type="button" className={styles.rawToggle} onClick={() => setShowRaw((value) => !value)}>
          {showRaw ? "Hide Raw JSON" : "View Raw JSON"}
        </button>
      </div>

      {showRaw ? (
        <pre className={styles.rawBlock}>{JSON.stringify(toolData.result, null, 2)}</pre>
      ) : entries.length > 0 ? (
        <div className="kvList">
          {entries.map((entry) => (
            <div className="kvRow" key={entry.key}>
              <span className="kvKey">{entry.key}</span>
              <span className="kvValue">{entry.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="textMuted">No structured data returned.</p>
      )}
    </div>
  );
}
