import type { ClipboardEvent } from "react";
import { deriveInputs } from "../services/intake";
import { phoneDigits } from "../utils/phone";
import { formValues } from "./actions";
import { P, render, S } from "./store";
type FilterKey =
  | "query"
  | "filter"
  | "userQuery"
  | "userRole"
  | "userStatus"
  | "auditQuery"
  | "auditType"
  | "reportQuery"
  | "reportCategory";
const filters: Record<string, FilterKey> = {
  patientQuery: "query",
  historySearch: "query",
  userSearch: "userQuery",
  auditSearch: "auditQuery",
  reportSearch: "reportQuery",
  historyCategory: "filter",
  userRole: "userRole",
  userStatus: "userStatus",
  auditType: "auditType",
  reportCategory: "reportCategory",
};
export function handleInput(target: HTMLInputElement) {
  if (target.id === "phone")
    target.value = phoneDigits(target.value).slice(0, 10);
  const key = filters[target.id];
  if (key && S.user) {
    S[key] = target.value;
    S.revealedId = null;
    S.announcement = "Results updated";
    render();
    return;
  }
  const form = target.closest<HTMLFormElement>("#assessmentForm");
  if (form) {
    S.draft = deriveInputs(formValues(form), S.draft);
    S.patientId = P(S.draft.pid)?.id ?? null;
    render();
  }
}
export function handleChange(target: HTMLInputElement) {
  if (target.id === "reportType" && S.user) {
    S.report = target.value;
    S.reportCategory = "All";
    S.revealedId = null;
    render();
    return;
  }
  if (target.id === "pid") S.revealedId = null;
  if (target.tagName === "SELECT") handleInput(target);
}
export function handlePaste(event: ClipboardEvent) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.id !== "phone") return;
  const text = event.clipboardData.getData("text");
  if (!text) return;
  event.preventDefault();
  target.value = phoneDigits(text).slice(0, 10);
  handleInput(target);
}
