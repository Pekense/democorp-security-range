"use client";

import { useState } from "react";

import { ChatTurn } from "@/components/ChatTurn";
import { ClientApiError, postChatMessage } from "@/lib/client";
import { useTrace } from "@/lib/trace-context";
import type { ChatResponse } from "@/types";

import styles from "./page.module.css";

interface Turn {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: ChatResponse;
}

const QUICK_EXAMPLES = [
  "Consulta el cliente CUST-001",
  "Consulta el pedido ORD-1001",
  "Simula una transferencia de 100 EUR desde ACC-001 a ACC-002",
];

let turnCounter = 0;
function nextId(): string {
  turnCounter += 1;
  return `turn-${turnCounter}-${Date.now()}`;
}

export default function FinanceAgentPage() {
  const trace = useTrace();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationOutcomes, setConfirmationOutcomes] = useState<Record<string, "confirmed" | "rejected">>({});

  async function send(message: string) {
    if (!message.trim() || sending) {
      return;
    }
    setError(null);
    setSending(true);
    setTurns((prev) => [...prev, { id: nextId(), role: "user", text: message }]);
    setInput("");

    try {
      const response = await postChatMessage({ message });
      trace.addRecord(message, response);
      setTurns((prev) => [...prev, { id: nextId(), role: "assistant", text: response.response, response }]);
    } catch (err) {
      const errorMessage = err instanceof ClientApiError ? err.message : "Finance Agent is unreachable.";
      setError(errorMessage);
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: `Request failed: ${errorMessage}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleConfirmed(response: ChatResponse, confirmationId: string) {
    trace.addRecord("Confirm the pending privileged action.", response);
    setConfirmationOutcomes((prev) => ({ ...prev, [confirmationId]: "confirmed" }));
    setTurns((prev) => [...prev, { id: nextId(), role: "assistant", text: response.response, response }]);
  }

  function handleRejected(confirmationId: string) {
    setConfirmationOutcomes((prev) => ({ ...prev, [confirmationId]: "rejected" }));
  }

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">Finance Agent</h1>
        <p className="pageSubtitle">Chat with DemoCorp&apos;s Finance AI Agent through the real Finance Agent API.</p>
      </div>

      <div className={styles.examples}>
        {QUICK_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className={`button ${styles.exampleButton}`}
            onClick={() => send(example)}
            disabled={sending}
          >
            {example}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className={styles.thread}>
          {turns.length === 0 ? (
            <div className={styles.emptyState}>Send a message or pick a quick example to start.</div>
          ) : (
            turns.map((turn) => (
              <ChatTurn
                key={turn.id}
                role={turn.role}
                text={turn.text}
                response={turn.response}
                outcome={turn.response?.confirmation_id ? confirmationOutcomes[turn.response.confirmation_id] : undefined}
                onConfirmed={(response) => handleConfirmed(response, turn.response!.confirmation_id!)}
                onRejected={() => handleRejected(turn.response!.confirmation_id!)}
              />
            ))
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <input
          className={styles.input}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the Finance Agent…"
          disabled={sending}
        />
        <button type="submit" className="button buttonPrimary" disabled={sending || !input.trim()}>
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </>
  );
}
