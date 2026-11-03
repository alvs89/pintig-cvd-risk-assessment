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
  { id: "employmentStatus", section, text: "Please choose which of the following best describes your current employment status?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 5, SA01, employment (unnumbered)", options: EMPLOYMENT_OPTIONS, optional: true, note: "Supplementary information; not used to calculate SES." },
  { id: "currentOccupation", section, text: "What is your current occupation?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, current occupation (unnumbered)", inputType: "text", optional: true, note: "Optional occupational context. Write in or leave blank; occupation codes are not assigned." },
  { id: "longestOccupation", section, text: "What is the occupation you have worked in longest?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, longest occupation (unnumbered)", inputType: "text", note: "Write in. Leave blank if unavailable. Occupation codes are not assigned." },
  { id: "familyIncomePH", section, text: "Please select which income group best represents your combined family income for the past 12 months.", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, income; PINTIG Philippine response-category adaptation", options: INCOME_OPTIONS, note: "Annual Philippine pesos, not monthly income. These peso categories are a Philippine adaptation; the source uses US dollars." },
  { id: "incomeSupportedPeople", section, text: "How many people are supported by this income?", source: "Gen-3-Exam-1 (1).pdf / Gen-3-Exam-1.pdf, PDF 6, SA02, supported people (unnumbered)", unit: "people", integer: true, min: 1, max: 100, note: "Count all people supported by the combined family income reported above. Leave blank if unknown or declined." },
];

// Preserve income as bounds, never silently substitute a midpoint or cap.
export function householdSes(a: Answers27, educationCategory: number | null) {
  const band = INCOME_OPTIONS.indexOf(a.familyIncomePH as typeof INCOME_OPTIONS[number]);
  const people = a.incomeSupportedPeople?.trim() ? Number(a.incomeSupportedPeople) : NaN;
  const validPeople = Number.isInteger(people) && people >= 1 && people <= 100;
  const edges = [0, 0, 166476, 332952, 665904, 1331808];
  const upper = [0, 166476, 332952, 665904, 1331808, null];
  const incomeInterval = band >= 0 && band <= 5 ? {
    lower: edges[band], upper: upper[band], lowerInclusive: band !== 1,
    upperInclusive: band === 0, unit: "PHP/year",
  } : null;
  const equivalizedIncomeInterval = incomeInterval && validPeople ? {
    ...incomeInterval,
    lower: incomeInterval.lower / Math.sqrt(people),
    upper: incomeInterval.upper === null ? null : incomeInterval.upper / Math.sqrt(people),
    unit: "PHP/year per square-root supported-person count",
  } : null;
  const complete = educationCategory !== null && equivalizedIncomeInterval !== null;
  return {
    educationCategory, incomeInterval, equivalizedIncomeInterval,
    supportedPeople: validPeople ? people : null,
    score: null as number | null,
    status: complete ? "reference-unavailable" : "responses-incomplete",
    reason: complete
      ? "SES unavailable: a suitable reference population and validated scoring parameters are not yet available."
      : "SES unavailable: education, annual family income and supported-person count are needed; reference scoring is also pending.",
    referenceId: null,
    method: "PINTIG-SES-1.3; categorical education and square-root-adjusted income bounds; reference scoring pending",
  };
}
