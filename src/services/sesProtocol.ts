import type { Answers27, Question27 } from "./assessment27";

export const INCOME_REFERENCE_ANNUAL = 13873 * 12;
export const INCOME_OPTIONS = [
  "0 = No income (PHP 0)",
  "1 = Above PHP 0 to below PHP 166,476",
  "2 = PHP 166,476 to below PHP 332,952",
  "3 = PHP 332,952 to below PHP 665,904",
  "4 = PHP 665,904 to below PHP 1,331,808",
  "5 = PHP 1,331,808 or more",
  "98 = Unknown", "99 = Prefer not to answer",
] as const;
export const EMPLOYMENT_OPTIONS = [
  "0 = homemaker, not working outside the home",
  "1 = employed (or self-employed) full time",
  "2 = employed (or self-employed) part time",
  "3 = employed, but on leave for health reasons",
  "4 = employed, but temporarily away from my job",
  "5 = unemployed or laid off or full-time student",
  "6 = retired from my usual occupation and not working",
  "7 = retired from my usual occupation but working for pay",
  "8 = retired from my usual occupation but volunteering",
  "9 = prefer not to answer",
  "10 = unemployed due to disability",
] as const;
const section = "Demographics and socioeconomic information";
export const SES_QUESTIONS: Question27[] = [
  { id: "employmentStatus", section, text: "Please choose which of the following best describes your current employment status?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 5, SA01, employment (unnumbered)", options: EMPLOYMENT_OPTIONS },
  { id: "currentOccupation", section, text: "What is your current occupation?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, current occupation (unnumbered)", inputType: "text", note: "Write in. Leave blank if unavailable. Occupation codes are not assigned." },
  { id: "longestOccupation", section, text: "What is the occupation you have worked in longest?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, longest occupation (unnumbered)", inputType: "text", note: "Write in. Leave blank if unavailable. Occupation codes are not assigned." },
  { id: "familyIncomePH", section, text: "Please select which income group best represents your combined family income for the past 12 months.", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, income; PINTIG Philippine response-category adaptation", options: INCOME_OPTIONS, note: "Annual Philippine pesos, not monthly income. These peso categories are a Philippine adaptation; the source uses US dollars." },
  { id: "incomeSupportedPeople", section, text: "How many people are supported by this income?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, supported people (unnumbered)", unit: "people", integer: true, min: 1, max: 100, note: "Count all people supported by the combined family income reported above. Leave blank if unknown or declined." },
];

export function householdSes(a: Answers27, education: number | null) {
  const band = INCOME_OPTIONS.indexOf(a.familyIncomePH as typeof INCOME_OPTIONS[number]);
  const people = a.incomeSupportedPeople?.trim() ? Number(a.incomeSupportedPeople) : NaN;
  const representative = band >= 0 && band <= 5 ? [0, 0.5, 1.5, 3, 6, 8][band] * INCOME_REFERENCE_ANNUAL : null;
  const income = representative !== null && Number.isInteger(people) && people >= 1 && people <= 100
    ? 100 * Math.min(1, (representative / people) / (8 * INCOME_REFERENCE_ANNUAL / 5)) : null;
  return { education, income, representativeAnnualIncome: representative,
    score: education === null || income === null ? null : 0.5 * education + 0.5 * income,
    method: "PINTIG-SES-1.1; equal education/income weights; fixed PSA 2023 reference; assumption-derived" };
}
