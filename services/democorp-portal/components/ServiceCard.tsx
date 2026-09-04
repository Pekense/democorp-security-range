import type { ServiceHealth } from "@/types";

import { ServiceStatusBadge } from "./StatusBadge";
import styles from "./ServiceCard.module.css";

export function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.top}>
        <span className={styles.name}>{service.name}</span>
        <ServiceStatusBadge status={service.status} />
      </div>
      <div className="kvList">
        <div className="kvRow">
          <span className="kvKey">Type</span>
          <span className="kvValue">{service.type}</span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Port</span>
          <span className="kvValue mono">{service.port}</span>
        </div>
        <div className="kvRow">
          <span className="kvKey">Health</span>
          <span className="kvValue">{service.status === "ONLINE" ? "Responding" : "Not responding"}</span>
        </div>
      </div>
    </div>
  );
}
