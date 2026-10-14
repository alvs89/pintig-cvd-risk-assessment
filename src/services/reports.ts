import { P, S, patients, records } from "../state/store";
import type { AssessmentRecord, Patient } from "../types/domain";
export function reportRows(type: "Patients"): Patient[];
export function reportRows(type: "Assessments"): AssessmentRecord[];
export function reportRows(): Patient[] | AssessmentRecord[];
export function reportRows(type = S.report) {
  const text = S.reportQuery.trim().toLowerCase();
  if (type === "Patients")
    return patients.filter((p) =>
      (p.record + " " + p.facility).toLowerCase().includes(text),
    );
  return records.filter((r) => {
    const p = P(r.pid);
    const match = ("AST-" + r.id + " " + (p?.record || ""))
      .toLowerCase()
      .includes(text);
    return match && (S.reportCategory === "All" || r.band === S.reportCategory);
  });
}
