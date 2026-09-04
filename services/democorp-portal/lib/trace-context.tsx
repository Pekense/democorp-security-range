"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { ChatResponse, TraceRecord } from "@/types";

const STORAGE_KEY = "democorp-portal:trace-history";
const MAX_RECORDS = 20;

interface TraceContextValue {
  records: TraceRecord[];
  latest: TraceRecord | null;
  addRecord: (userMessage: string, response: ChatResponse) => void;
  clear: () => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

function readStoredRecords(): TraceRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TraceRecord[]) : [];
  } catch {
    return [];
  }
}

export function TraceProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<TraceRecord[]>([]);

  useEffect(() => {
    // Hydrating from localStorage must happen post-mount, not in the initial
    // render, to keep the server-rendered and first client-rendered markup
    // identical (localStorage does not exist during server rendering).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(readStoredRecords());
  }, []);

  const persist = useCallback((next: TraceRecord[]) => {
    setRecords(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best-effort only; the Trace Explorer simply falls back to in-memory state.
    }
  }, []);

  const addRecord = useCallback(
    (userMessage: string, response: ChatResponse) => {
      const record: TraceRecord = {
        request_id: response.request_id,
        trace_id: response.trace_id,
        user_message: userMessage,
        response,
        timestamp: new Date().toISOString(),
      };
      persist([record, ...records].slice(0, MAX_RECORDS));
    },
    [records, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo<TraceContextValue>(
    () => ({ records, latest: records[0] ?? null, addRecord, clear }),
    [records, addRecord, clear],
  );

  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}

export function useTrace(): TraceContextValue {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error("useTrace must be used within a TraceProvider");
  }
  return context;
}
