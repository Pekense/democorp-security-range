import { SecurityVariantCallout } from "@/components/SecurityVariantCallout";
import { SecurityVariantBadge } from "@/components/StatusBadge";
import { getSecurityVariantInfo } from "@/lib/api";
import type { SecurityVariant, SecurityVariantInfo } from "@/types";

export const dynamic = "force-dynamic";

interface VariantCardCopy {
  variant: SecurityVariant;
  title: string;
  origin: string;
  steps: string[];
}

const VARIANT_COPY: VariantCardCopy[] = [
  {
    variant: "vulnerable",
    title: "Baseline, unenforced",
    origin: "baseline_unenforced",
    steps: ["Privileged action requested", "No confirmation is required", "Action executes immediately"],
  },
  {
    variant: "safe",
    title: "Secure by design",
    origin: "secure_by_design",
    steps: ["Privileged action requested", "Confirmation is required", "Action executes only after approval"],
  },
  {
    variant: "patched",
    title: "Mitigation applied",
    origin: "mitigation_applied",
    steps: [
      "Originally the vulnerable flow",
      "Confirmation mitigation applied",
      "Action executes only after approval",
    ],
  },
];

export default async function SecurityVariantsPage() {
  let variantInfo: SecurityVariantInfo | null = null;
  try {
    variantInfo = await getSecurityVariantInfo();
  } catch {
    variantInfo = null;
  }
  const activeVariant = variantInfo?.security_variant ?? null;

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">Security Variants</h1>
        <p className="pageSubtitle">
          How the Finance Agent enforces human confirmation for privileged actions, per runtime variant.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        {variantInfo ? (
          <SecurityVariantCallout variant={variantInfo.security_variant} policyOrigin={variantInfo.policy_origin} />
        ) : (
          <div className="card">
            <div className="cardHeader">
              <span className="cardTitle">Currently Active</span>
            </div>
            <p className="textMuted">Finance Agent is unreachable — active variant unknown.</p>
          </div>
        )}
      </div>

      <div className="grid grid3" style={{ marginBottom: 16 }}>
        {VARIANT_COPY.map((entry) => (
          <div className="card" key={entry.variant}>
            <div className="cardHeader">
              <SecurityVariantBadge variant={entry.variant} />
              {activeVariant === entry.variant && <span className="badge badge-accent">Active</span>}
            </div>
            <p className="textSecondary" style={{ marginBottom: 12 }}>
              {entry.title}
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              {entry.steps.map((step) => (
                <li key={step} className="textSecondary" style={{ fontSize: 13 }}>
                  {step}
                </li>
              ))}
            </ol>
            <hr className="divider" />
            <div className="kvRow">
              <span className="kvKey">policy_origin</span>
              <span className="kvValue mono">{entry.origin}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="cardHeader">
          <span className="cardTitle">Switching the Active Variant</span>
        </div>
        <p className="textSecondary" style={{ marginBottom: 12 }}>
          The active variant is selected by the <code className="mono">SECURITY_VARIANT</code> environment
          variable on the Finance Agent container. Changing it requires recreating that container — this
          Portal does not perform Docker operations itself.
        </p>
        <pre
          className="mono"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            overflowX: "auto",
          }}
        >
{`SECURITY_VARIANT=vulnerable docker compose up -d --build finance-agent
SECURITY_VARIANT=safe      docker compose up -d --build finance-agent
SECURITY_VARIANT=patched   docker compose up -d --build finance-agent`}
        </pre>
      </div>
    </>
  );
}
