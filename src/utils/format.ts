import type { Patient } from "../types/domain";
export const esc = (value: unknown): string => String(value ?? ""); // React escapes text and attributes.
export const pname = (p: Patient): string =>
  [p.first, p.middle, p.last].filter(Boolean).join(" ");
export const T = (): string => new Date().toISOString().slice(0, 10);
export const dt = (value: string): string =>
  new Date(value + "T12:00:00").toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
export function age(dob: string, today = new Date()): number {
  const birth = new Date(dob + "T12:00:00");
  return (
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0)
  );
}
