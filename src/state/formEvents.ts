import type { ClipboardEvent } from "react";
import { deriveInputs } from "../services/intake";
import { phoneDigits } from "../utils/phone";
import { formValues, openPintigConfirm } from "./actions";
import { hasIntakeAnswers } from "./seededIntakes";
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
    if (target.id === "sbp")
      form
        .querySelector("#dbp")
        ?.dispatchEvent(new Event("pintig:numeric-validation"));
    if (
      target.id === "pid" &&
      Number(target.value) !== (S.patientId ?? 0) &&
      hasIntakeAnswers(S.draft)
    ) {
      const nextPatient = P(target.value)?.id ?? null;
      target.value = S.patientId ? String(S.patientId) : "";
      openPintigConfirm({
        title: "Change assessment patient?",
        description:
          "This will clear the unsaved questionnaire answers so they are not assigned to another patient. Saved assessments will not be affected.",
        actionLabel: "Change patient",
        onConfirm: () => {
          S.patientId = nextPatient;
          S.draft = nextPatient
            ? { pid: String(nextPatient), mode: "extended" }
            : null;
          S.result = null;
          S.revealedId = null;
          S.formRevision++;
          render();
        },
      });
      return;
    }
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
