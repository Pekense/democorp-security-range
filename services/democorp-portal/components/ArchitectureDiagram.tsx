import styles from "./ArchitectureDiagram.module.css";

function Node({
  label,
  sub,
  accent,
  secondary,
}: {
  label: string;
  sub: string;
  accent?: boolean;
  secondary?: boolean;
}) {
  const className = [styles.node, accent && styles.nodeAccent, secondary && styles.nodeSecondary]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <span className={styles.nodeLabel}>{label}</span>
      <span className={styles.nodeSub}>{sub}</span>
    </div>
  );
}

/**
 * Vertical request spine (User -> Finance Agent -> MCP Server -> Backend
 * API) with Ollama branching sideways off the Finance Agent, since it is a
 * peer dependency the agent calls out to, not a hop on the tool-call path.
 */
export function ArchitectureDiagram() {
  return (
    <div className={styles.grid}>
      <div className={styles.spineCol}>
        <Node label="User" sub="Operator" />
      </div>

      <span className={styles.vArrow}>&darr;</span>

      <div className={styles.spineCol}>
        <Node label="Finance Agent" sub="AI Agent" accent />
      </div>
      <span className={styles.hArrow}>&rarr;</span>
      <Node label="Ollama" sub="Local LLM Runtime" secondary />

      <span className={styles.vArrow}>&darr;</span>

      <div className={styles.spineCol}>
        <Node label="MCP Server" sub="Tool Gateway" />
      </div>

      <span className={styles.vArrow}>&darr;</span>

      <div className={styles.spineCol}>
        <Node label="Backend API" sub="Business Data" />
      </div>
    </div>
  );
}
