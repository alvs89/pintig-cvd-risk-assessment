export function phoneDigits(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^639\d{9}$/.test(digits)) return digits.slice(2);
  if (/^09\d{9}$/.test(digits)) return digits.slice(1);
  return digits;
}
