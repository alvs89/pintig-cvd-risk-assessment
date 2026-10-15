import { numericInputError } from "./numericValidation";

export function selectionError(
  name: string,
  value: string,
  required: boolean,
): string {
  if (!required) return "";
  if (name === "currentSmoking" && !["Yes", "No"].includes(value))
    return value === "Unknown"
      ? "Current smoking status is not confirmed. Verify it before continuing."
      : "Choose an answer about the patient's current smoking status.";
  if (name === "bpMeds" && !["Yes", "No"].includes(value))
    return value === "Unknown"
      ? "Current blood-pressure medication use is not confirmed. Verify it before continuing."
      : "Choose an answer about current blood-pressure medication use.";
  return value === ""
    ? name === "pid"
      ? "Choose a patient before continuing."
      : "Choose an answer before continuing."
    : "";
}
/** Validate in questionnaire order; retain all values and focus the first problem. */
export function validateAssessmentForm(form: HTMLFormElement): boolean {
  let first: HTMLInputElement | HTMLSelectElement | undefined;
  for (const control of form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >('input[type="number"], select')) {
    if (control.disabled || control.closest("#extraQuestionnaire[hidden]"))
      continue;
    const error =
      control instanceof HTMLSelectElement
        ? selectionError(
            control.name,
            control.value,
            control.getAttribute("aria-required") === "true",
          )
        : numericInputError(control);
    control.dispatchEvent(
      new Event(
        control instanceof HTMLSelectElement
          ? "pintig:assessment-validation"
          : "pintig:numeric-validation",
      ),
    );
    if (error && !first) first = control;
  }
  if (!first) return true;
  const target = first.hidden
    ? first
        .closest(".bmi-value-host")
        ?.querySelector<HTMLElement>(".derived-text-value")
    : first;
  requestAnimationFrame(() => {
    if (!target?.isConnected) return;
    if (first?.hidden) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
  return false;
}
