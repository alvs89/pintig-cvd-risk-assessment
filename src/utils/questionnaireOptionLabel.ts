/** Display source-coded answers without changing their stored values. */
export function questionnaireOptionLabel(value: string): string {
  const text = value.replace(/^\d+\s*=\s*/, "");
  if (text.toLowerCase() === "unk") return "Unknown";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
