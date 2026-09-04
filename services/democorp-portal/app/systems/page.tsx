import { ServiceStatusBadge } from "@/components/StatusBadge";
import { getSystemsHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const services = await getSystemsHealth();

  return (
    <>
      <div className="pageHeader">
        <h1 className="pageTitle">Systems</h1>
        <p className="pageSubtitle">
          Live health, checked server-side by the Portal against each component&apos;s own health endpoint.
        </p>
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Type</th>
                <th>Port</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td className="textSecondary">{service.type}</td>
                  <td className="mono">{service.port}</td>
                  <td>
                    <ServiceStatusBadge status={service.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
