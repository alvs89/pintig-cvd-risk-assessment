import { b, head, metric, recordsTable } from "../components/shared";
import { patients, records, S, users } from "../state/store";
import { T } from "../utils/format";
import { RiskDistributionChart } from "../components/RiskDistributionChart";
export function DashboardPage() {
  let admin = S.user!.role === "admin";
  return (
    <>
      {head(
        admin ? "Administrator Dashboard" : "Healthcare Dashboard",
        "Patient and assessment activity overview.",
      )}
      <div className={"cards"}>
        {admin ? (
          <>
            {metric("User accounts", users.length)}
            {metric("Active accounts", users.filter((u) => u.active).length)}
            {metric("Registered patients", patients.length)}
            {metric("Assessment records", records.length)}
          </>
        ) : (
          <>
            {metric("Registered patients", patients.length)}
            {metric("Total assessments", records.length)}
            {metric(
              "Assessed patients",
              new Set(records.map((r) => r.pid)).size,
            )}
            {metric(
              "This month",
              records.filter((r) => r.date.slice(0, 7) === T().slice(0, 7))
                .length,
            )}
          </>
        )}
      </div>
      <div className={"twocol"}>
        <div className={"panel"}>
          <h2>{"Quick actions"}</h2>
          <div className={"actions"}>
            {b("Patient Management", "nav:Patient Management")}
            {b("New Assessment", "nav:New Risk Assessment")}
            {b(
              admin ? "User Accounts" : "Assessment History",
              "nav:" + (admin ? "User Accounts" : "Assessment History"),
            )}
          </div>
        </div>
        <div className={"panel"}>
          <h2>{"Assessment services"}</h2>
          <p>{"✓ Patient management and risk assessment"}</p>
          <p className={"muted tiny"}>
            {
              "Review assessment activity, records, and results in one workspace."
            }
          </p>
        </div>
      </div>
      <RiskDistributionChart records={records} administrator={admin} />
      <section className={"panel"}>
        <h2>{"Recent assessments"}</h2>
        {recordsTable(records.slice().reverse().slice(0, 5))}
      </section>
    </>
  );
}
