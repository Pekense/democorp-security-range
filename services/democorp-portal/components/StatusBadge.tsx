import type { TraceStatus } from "@/lib/trace";
import type { SecurityVariant, ServiceStatus } from "@/types";

type Tone = "success" | "danger" | "warning" | "neutral" | "accent";

function badgeClass(tone: Tone): string {
  return `badge badge-${tone}`;
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const tone: Tone = status === "ONLINE" ? "success" : status === "OFFLINE" ? "danger" : "neutral";
  return (
    <span className={badgeClass(tone)}>
      <span className="badgeDot" />
      {status}
    </span>
  );
}

const VARIANT_TONE: Record<SecurityVariant, Tone> = {
  safe: "success",
  vulnerable: "danger",
  patched: "warning",
};

export function SecurityVariantBadge({ variant }: { variant: SecurityVariant }) {
  return <span className={badgeClass(VARIANT_TONE[variant])}>{variant}</span>;
}

export function ClassificationBadge({ classification }: { classification: "READ_ONLY" | "PRIVILEGED" }) {
  const tone: Tone = classification === "READ_ONLY" ? "accent" : "warning";
  return <span className={badgeClass(tone)}>{classification.replace("_", " ")}</span>;
}

const TRACE_STATUS_TONE: Record<TraceStatus, Tone> = {
  REQUESTED: "neutral",
  EXECUTED: "success",
  CONFIRMATION_REQUIRED: "warning",
  SIMULATED_TRANSFER: "accent",
};

export function TraceStatusBadge({ status }: { status: TraceStatus }) {
  return <span className={badgeClass(TRACE_STATUS_TONE[status])}>{status.replace(/_/g, " ")}</span>;
}

export function BooleanBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return <span className={badgeClass(value ? "warning" : "neutral")}>{value ? trueLabel : falseLabel}</span>;
}
