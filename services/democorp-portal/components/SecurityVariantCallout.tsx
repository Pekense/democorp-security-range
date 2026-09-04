import type { SecurityVariant } from "@/types";

import { SecurityVariantBadge } from "./StatusBadge";
import styles from "./SecurityVariantCallout.module.css";

const VARIANT_COPY: Record<SecurityVariant, string> = {
  safe: "Privileged actions require human confirmation before they execute.",
  vulnerable: "Privileged actions execute immediately — no confirmation is requested.",
  patched: "Originally vulnerable; a confirmation mitigation is now enforced.",
};

export function SecurityVariantCallout({
  variant,
  policyOrigin,
}: {
  variant: SecurityVariant;
  policyOrigin: string;
}) {
  return (
    <div className={`${styles.callout} ${styles[variant]}`}>
      <div className={styles.top}>
        <span className="cardTitle">Active Security Variant</span>
        <SecurityVariantBadge variant={variant} />
      </div>
      <p className={styles.copy}>{VARIANT_COPY[variant]}</p>
      <span className={styles.origin}>policy_origin: {policyOrigin}</span>
    </div>
  );
}
