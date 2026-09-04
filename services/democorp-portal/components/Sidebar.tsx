"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/finance-agent", label: "Finance Agent" },
  { href: "/mcp-tools", label: "MCP Tools" },
  { href: "/security-variants", label: "Security Variants" },
  { href: "/trace-explorer", label: "Trace Explorer" },
  { href: "/systems", label: "Systems" },
];

const COMING_SOON_ITEMS = ["Customer Chatbot", "RAG Assistant", "LLM Application"];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <div className={styles.brandLogo}>DC</div>
          <div>
            <div className={styles.brandName}>DemoCorp</div>
            <div className={styles.brandSubtitle}>Enterprise Security Range</div>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Operations</div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
            >
              <span className={styles.navDot} />
              {item.label}
            </Link>
          );
        })}

        <div className={styles.sectionLabel}>Applications</div>
        {COMING_SOON_ITEMS.map((label) => (
          <div key={label} className={styles.navItemDisabled}>
            <span>{label}</span>
            <span className={styles.comingSoonTag}>Soon</span>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>Controlled AI Security Environment</div>
    </aside>
  );
}
