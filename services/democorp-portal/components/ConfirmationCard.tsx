"use client";

import { useEffect, useState } from "react";

import { fetchPendingConfirmation, postChatMessage } from "@/lib/client";
import type { ChatResponse, PendingConfirmationInfo, SecurityVariant } from "@/types";

import { SecurityVariantBadge } from "./StatusBadge";
import styles from "./ConfirmationCard.module.css";

interface ConfirmationCardProps {
  confirmationId: string;
  securityVariant: SecurityVariant;
  onConfirmed: (response: ChatResponse) => void;
  onRejected: () => void;
}

export function ConfirmationCard({ confirmationId, securityVariant, onConfirmed, onRejected }: ConfirmationCardProps) {
  const [details, setDetails] = useState<PendingConfirmationInfo | null | "unavailable">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPendingConfirmation(confirmationId)
      .then((result) => {
        if (!cancelled) {
          setDetails(result ?? "unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetails("unavailable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [confirmationId]);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      const response = await postChatMessage({
        message: "Confirm the pending privileged action.",
        confirmation_id: confirmationId,
      });
      onConfirmed(response);
    } catch {
      setError("Confirmation request failed. The pending action may have expired.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Privileged Action Requires Confirmation</span>
        <SecurityVariantBadge variant={securityVariant} />
      </div>

      <div className="kvList">
        <div className="kvRow">
          <span className="kvKey">Tool</span>
          <span className="kvValue mono">
            {details === null ? "Loading…" : details === "unavailable" ? "Unavailable" : details.tool_name}
          </span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Confirmation ID</span>
          <span className="kvValue mono">{confirmationId}</span>
        </div>
        {details && details !== "unavailable" && (
          <div className="kvRow">
            <span className="kvKey">Arguments</span>
            <span className="kvValue mono">{JSON.stringify(details.tool_arguments)}</span>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className="button buttonPrimary" onClick={handleConfirm} disabled={busy}>
          {busy ? "Confirming…" : "Confirm"}
        </button>
        <button type="button" className="button buttonDanger" onClick={onRejected} disabled={busy}>
          Reject
        </button>
      </div>
      <p className={styles.note}>
        Confirm sends the real confirmation request to the Finance Agent and executes the pending tool call.
        Reject only discards this card locally — there is no backend cancellation endpoint, so the pending
        confirmation simply expires on its own after its TTL.
      </p>
    </div>
  );
}
