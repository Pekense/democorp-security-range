"use client";

import { isPrivilegedTool } from "@/lib/format";
import type { ChatResponse } from "@/types";

import { ConfirmationCard } from "./ConfirmationCard";
import { SecurityVariantBadge } from "./StatusBadge";
import { ToolDataView } from "./ToolDataView";
import styles from "./ChatTurn.module.css";

interface ChatTurnProps {
  role: "user" | "assistant";
  text: string;
  response?: ChatResponse;
  outcome?: "confirmed" | "rejected";
  onConfirmed: (response: ChatResponse) => void;
  onRejected: () => void;
}

export function ChatTurn({ role, text, response, outcome, onConfirmed, onRejected }: ChatTurnProps) {
  if (role === "user") {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{text}</div>
      </div>
    );
  }

  const showExecutedWithoutConfirmation =
    response?.security_variant === "vulnerable" && response.tools_used.some((name) => isPrivilegedTool(name));

  return (
    <div className={styles.assistantRow}>
      <div className={styles.assistantCard}>
        <p className={styles.responseText}>{text}</p>

        {response?.confirmation_required && response.confirmation_id && !outcome && (
          <ConfirmationCard
            confirmationId={response.confirmation_id}
            securityVariant={response.security_variant}
            onConfirmed={onConfirmed}
            onRejected={onRejected}
          />
        )}

        {outcome === "rejected" && (
          <p className={styles.resolvedNote}>Discarded locally — no backend action was taken.</p>
        )}
        {outcome === "confirmed" && (
          <p className={styles.resolvedNote}>Confirmed — see the following message for the result.</p>
        )}

        {response && response.tools_used.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Tools Used</span>
            <div className={styles.toolBadges}>
              {response.tools_used.map((toolName, index) => (
                <span key={`${toolName}-${index}`} className="badge badge-neutral">
                  {toolName}
                </span>
              ))}
              {showExecutedWithoutConfirmation && (
                <span className="badge badge-danger">Executed without confirmation</span>
              )}
            </div>
          </div>
        )}

        {response && response.tool_data.length > 0 && (
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Tool Data</span>
            <div className={styles.toolDataList}>
              {response.tool_data.map((toolData, index) => (
                <ToolDataView key={`${toolData.tool_name}-${index}`} toolData={toolData} />
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className={styles.meta}>
            <span className="mono textMuted">request_id: {response.request_id}</span>
            <span className="mono textMuted">trace_id: {response.trace_id}</span>
            <SecurityVariantBadge variant={response.security_variant} />
          </div>
        )}
      </div>
    </div>
  );
}
