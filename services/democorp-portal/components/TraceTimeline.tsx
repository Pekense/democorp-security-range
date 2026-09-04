import type { TraceStep } from "@/lib/trace";

import styles from "./TraceTimeline.module.css";

export function TraceTimeline({ steps }: { steps: TraceStep[] }) {
  return (
    <div className={styles.timeline}>
      {steps.map((step, index) => (
        <div key={`${step.label}-${index}`} style={{ display: "flex", alignItems: "center" }}>
          <span className={step.status === "blocked" ? `${styles.step} ${styles.stepBlocked}` : styles.step}>
            {step.label}
          </span>
          {index < steps.length - 1 && <span className={styles.connector}>&rarr;</span>}
        </div>
      ))}
    </div>
  );
}
