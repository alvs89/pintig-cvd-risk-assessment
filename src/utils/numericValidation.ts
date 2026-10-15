export interface NumericRules {
  min?: string | number;
  max?: string | number;
  step?: string | number;
  required?: boolean;
}
export function numericError(
  value: string,
  rules: NumericRules,
  badInput = false,
): string {
  if (badInput || (value !== "" && !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)))
    return "Enter a valid number using digits and a decimal point.";
  if (value === "") return rules.required ? "Enter a value." : "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Enter a finite number.";
  const min =
    rules.min === undefined || rules.min === "" ? undefined : Number(rules.min);
  const max =
    rules.max === undefined || rules.max === "" ? undefined : Number(rules.max);
  if (
    (min !== undefined && number < min) ||
    (max !== undefined && number > max)
  ) {
    return min !== undefined && max !== undefined
      ? `Value must be between ${min} and ${max}.`
      : min !== undefined
        ? `Value must be at least ${min}.`
        : `Value must be no more than ${max}.`;
  }
  const step = Number(rules.step ?? 1);
  const steps = (number - (min ?? 0)) / step;
  if (step > 0 && Math.abs(steps - Math.round(steps)) > 1e-8)
    return `Use increments of ${step}${min !== undefined ? ` starting from ${min}` : ""}.`;
  return "";
}
export function numericInputError(input: HTMLInputElement): string {
  const error = numericError(
    input.value,
    {
      min: input.min,
      max: input.max,
      step: input.step || "1",
      required: input.required,
    },
    input.validity.badInput,
  );
  if (error) return error;
  const systolic = input.form?.elements.namedItem(
    "sbp",
  ) as HTMLInputElement | null;
  if (
    input.id === "dbp" &&
    input.value !== "" &&
    systolic?.value &&
    Number(input.value) >= Number(systolic.value)
  )
    return "Diastolic pressure must be lower than systolic pressure.";
  return "";
}
export function validateNumericForm(form: HTMLFormElement): boolean {
  let first: HTMLInputElement | undefined;
  for (const input of form.querySelectorAll<HTMLInputElement>(
    'input[type="number"]:not(:disabled)',
  )) {
    input.dispatchEvent(new Event("pintig:numeric-validation"));
    if (numericInputError(input) && !first) first = input;
  }
  if (first) {
    const focus = first.hidden
      ? first.parentElement?.querySelector<HTMLElement>(".derived-text-value")
      : first;
    if (first.hidden) focus?.setAttribute("tabindex", "-1");
    focus?.focus();
  }
  return !first;
}
