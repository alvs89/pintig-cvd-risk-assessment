import type {
  AssessmentRecord,
  AuditEntry,
  Patient,
  Session,
  User,
} from "../types/domain";
import { originalPatients } from "./originalPatients";
import { createAdditionalPopulation } from "./additionalPatients";
const additionalPopulation = createAdditionalPopulation();
export const users: User[] = [
  {
    id: 1,
    name: "System Administrator",
    email: "admin@pintig.demo",
    pass: "Admin123!",
    role: "admin",
    active: true,
  },
  {
    id: 2,
    name: "Maria Santos, RN",
    email: "worker@pintig.demo",
    pass: "Worker123!",
    role: "worker",
    active: true,
  },
  {
    id: 3,
    name: "Joel Reyes, RN",
    email: "joel@pintig.demo",
    pass: "Worker123!",
    role: "worker",
    active: true,
  },
];
export const patients: Patient[] = [
  ...originalPatients.map((patient) => ({ ...patient })),
  ...additionalPopulation.patients,
];
export const records: AssessmentRecord[] = [
  {
    id: 1,
    pid: 1,
    uid: 2,
    date: "2026-09-26",
    risk: 0.238,
    band: "Very High",
    model: "ILLUSTRATIVE-0.2",
    inputs: {
      sbp: "165",
      dbp: "95",
      bmi: "29",
      smoking: "Current",
      diabetes: "Yes",
    },
    explanation: "Age, blood pressure and recorded health factors.",
    guidance: "General cardiovascular health education.",
  },
  {
    id: 2,
    pid: 2,
    uid: 2,
    date: "2026-09-30",
    risk: 0.114,
    band: "High",
    model: "ILLUSTRATIVE-0.2",
    inputs: { sbp: "145", dbp: "88", bmi: "27", smoking: "Never" },
    explanation: "Age and systolic blood pressure.",
    guidance: "General cardiovascular health education.",
  },
  ...additionalPopulation.records,
];
export const logs: AuditEntry[] = [
  { when: "2026-09-30", user: "System", action: "Initialized patient records" },
];
export const S: Session = {
  preAssessment: null,
  user: null,
  page: "Dashboard",
  patientId: null,
  editPatient: null,
  editUser: null,
  query: "",
  filter: "All",
  draft: null,
  result: null,
  historyId: null,
  report: "Patients",
  help: "guide",
  message: "",
  error: false,
  reset: false,
  revealedId: null,
  userQuery: "",
  userRole: "All",
  userStatus: "All",
  auditQuery: "",
  auditType: "All",
  reportQuery: "",
  reportCategory: "All",
  confirmation: null,
  formRevision: 0,
  announcement: "",
};

let revision = 0;
const listeners = new Set<() => void>();
export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getSnapshot = () => revision;
export function render() {
  revision++;
  for (const listener of listeners) listener();
}
export const P = (id: string | number | null | undefined) =>
  patients.find((p) => p.id === Number(id));
export const U = (id: string | number | null | undefined) =>
  users.find((u) => u.id === Number(id));
export const log = (action: string) =>
  logs.unshift({
    when: new Date().toLocaleString("en-PH"),
    user: S.user?.name || "System",
    action,
  });
export const msg = (message: string, error = false) => {
  S.message = message;
  S.error = error;
};
