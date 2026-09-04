import { BooleanBadge, ClassificationBadge } from "@/components/StatusBadge";
import { getToolSummaries } from "@/lib/api";

export const dynamic = "force-dynamic";

const FALLBACK_NOTE =
  "MCP Server metadata is temporarily unavailable. Showing the last known tool catalog as a fallback.";

const FALLBACK_TOOLS = [
  {
    name: "crm_lookup",
    description: "Look up a DemoCorp customer through the Backend API.",
    classification: "READ_ONLY" as const,
    read_only: true,
    dangerous_capability: false,
    requires_human_confirmation: false,
  },
  {
    name: "get_order",
    description: "Look up a DemoCorp order through the Backend API.",
    classification: "READ_ONLY" as const,
    read_only: true,
    dangerous_capability: false,
    requires_human_confirmation: false,
  },
  {
    name: "transfer_funds_simulated",
    description: "Simulate a funds transfer without changing state or contacting external services.",
    classification: "PRIVILEGED" as const,
    read_only: false,
    dangerous_capability: true,
    requires_human_confirmation: true,
  },
];

export default async function McpToolsPage() {
  let tools = FALLBACK_TOOLS;
  let usedFallback = false;

  try {
    const live = await getToolSummaries();
    if (live.length > 0) {
      tools = live;
    } else {
      usedFallback = true;
    }
  } catch {
    usedFallback = true;
  }

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">MCP Tools</h1>
        <p className="pageSubtitle">Tool catalog exposed by the MCP Server, discovered through the Finance Agent.</p>
      </div>

      {usedFallback && (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(232,172,62,0.35)" }}>
          <p className="textSecondary">{FALLBACK_NOTE}</p>
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Classification</th>
                <th>Read Only</th>
                <th>Dangerous Capability</th>
                <th>Human Confirmation</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}>
                  <td className="mono">{tool.name}</td>
                  <td>
                    <ClassificationBadge classification={tool.classification} />
                  </td>
                  <td>
                    <BooleanBadge value={tool.read_only} trueLabel="Yes" falseLabel="No" />
                  </td>
                  <td>
                    <BooleanBadge value={tool.dangerous_capability} trueLabel="Yes" falseLabel="No" />
                  </td>
                  <td>
                    <BooleanBadge value={tool.requires_human_confirmation} trueLabel="Required" falseLabel="Not Required" />
                  </td>
                  <td className="textSecondary">{tool.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
