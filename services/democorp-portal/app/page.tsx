import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { LastActivityCard } from "@/components/LastActivityCard";
import { SecurityVariantCallout } from "@/components/SecurityVariantCallout";
import { ServiceCard } from "@/components/ServiceCard";
import { getSecurityVariantInfo, getSystemsHealth, getToolSummaries } from "@/lib/api";
import type { SecurityVariantInfo, ServiceHealth, ToolSummary } from "@/types";

export const dynamic = "force-dynamic";

async function safeToolSummaries(): Promise<ToolSummary[] | null> {
  try {
    return await getToolSummaries();
  } catch {
    return null;
  }
}

async function safeSecurityVariant(): Promise<SecurityVariantInfo | null> {
  try {
    return await getSecurityVariantInfo();
  } catch {
    return null;
  }
}

export default async function OverviewPage() {
  const [services, tools, variantInfo] = await Promise.all([
    getSystemsHealth(),
    safeToolSummaries(),
    safeSecurityVariant(),
  ]);

  const allOnline = services.every((service: ServiceHealth) => service.status === "ONLINE");
  const readOnlyCount = tools?.filter((tool) => tool.classification === "READ_ONLY").length ?? null;
  const privilegedCount = tools?.filter((tool) => tool.classification === "PRIVILEGED").length ?? null;

  return (
    <>
      <div className="pageHeader">
        <h1 className="heroTitle">DemoCorp Enterprise Security Range</h1>
        <div className="heroTagline">
          <span className="badgeDot" />
          Controlled AI Security Environment
        </div>
        <p className="heroStatus">{allOnline ? "All systems online" : "Some systems are unreachable"}</p>
      </div>

      <div className="grid grid4" style={{ marginBottom: 16 }}>
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      <div className="grid grid3" style={{ marginBottom: 16 }}>
        {variantInfo ? (
          <SecurityVariantCallout variant={variantInfo.security_variant} policyOrigin={variantInfo.policy_origin} />
        ) : (
          <div className="card">
            <div className="cardHeader">
              <span className="cardTitle">Active Security Variant</span>
            </div>
            <p className="textMuted">Finance Agent is unreachable — variant unknown.</p>
          </div>
        )}

        <div className="card">
          <div className="cardHeader">
            <span className="cardTitle">MCP Tools</span>
          </div>
          {tools ? (
            <div className="kvList">
              <div className="kvRow">
                <span className="kvKey">Total Tools</span>
                <span className="kvValue">{tools.length}</span>
              </div>
              <div className="kvRow">
                <span className="kvKey">READ_ONLY</span>
                <span className="kvValue">{readOnlyCount}</span>
              </div>
              <div className="kvRow">
                <span className="kvKey">PRIVILEGED</span>
                <span className="kvValue">{privilegedCount}</span>
              </div>
            </div>
          ) : (
            <p className="textMuted">Tool metadata is unavailable.</p>
          )}
        </div>

        <LastActivityCard />
      </div>

      <div className="card">
        <div className="cardHeader">
          <span className="cardTitle">Request Flow</span>
        </div>
        <ArchitectureDiagram />
      </div>
    </>
  );
}
