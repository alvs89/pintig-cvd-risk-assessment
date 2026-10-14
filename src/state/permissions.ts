import type { Page, Patient, Role } from "../types/domain";
import { S, patients } from "./store";
export const adminNav: Page[] = [
  "Dashboard",
  "Patient Management",
  "New Risk Assessment",
  "Assessment History",
  "Reports",
  "User Accounts",
  "Audit Logs",
  "Maintenance",
  "Help",
  "About",
  "My Account",
];
export const workerNav: Page[] = [
  "Dashboard",
  "Patient Management",
  "New Risk Assessment",
  "Assessment History",
  "Help",
  "About",
  "My Account",
];
export const allowedPages = (role: Role): Page[] =>
  role === "admin" ? adminNav : workerNav;
export const canReveal = (p?: Partial<Patient> | null): boolean =>
  !!S.user?.active &&
  ["admin", "worker"].includes(S.user.role) &&
  !!p &&
  patients.some((v) => v.id === p.id);
export const isRevealed = (p?: Partial<Patient> | null): boolean =>
  canReveal(p) && S.revealedId === p?.id;
export const adminActions = new Set([
  "newUser",
  "editUser",
  "toggleUser",
  "filterUsers",
  "clearUsers",
  "filterAudit",
  "clearAudit",
  "clearReport",
  "generateReport",
  "exportCSV",
  "backup",
]);
