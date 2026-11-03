import ipaq from "../data/ipaq27.json";
import type { Patient } from "../types/domain";
import { age } from "../utils/format";
import { additionalFeatures, PROTOCOL_QUESTIONS } from "./featureProtocolV1";

export const INTAKE27_SCHEMA = "PINTIG-INTAKE-27-20261103";
export type Answers27 = Record<string, string>;
export type Question27 = {
  id: string;
  section: string;
  text: string;
  sharedPrompt?: string;
  context?: string;
  source: string;
  options?: readonly string[];
  unit?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  note?: string;
  inputType?: "text";
  optional?: boolean;
  when?: (a: Answers27) => boolean;
};
const yn = ["0 = No", "1 = Yes", "9 = Unknown"];
const yes = (a: Answers27, k: string) =>
  a[k] === "Yes" || a[k]?.startsWith("1 =");
const no = (a: Answers27, k: string) =>
  a[k] === "No" || a[k]?.startsWith("0 =");
const med = ["0 = no", "1 = yes, now", "2 = yes, not now", "9 = unk"];
const stress = [
  "No response",
  "Never Experienced Stress",
  "Some Period of Stress",
  "Several Periods of Stress",
  "Permanent Stress",
];
const questions: Question27[] = [];
const add = (q: Question27) => questions.push(q);
const pure = (p: number, q: string) =>
  `pone.0271169.s001.pdf / PURE.pdf, PDF ${p}, ${q}`;
const gen = (p: number, q: string) => `Gen-3-Exam-1.pdf, PDF ${p}, ${q}`;
export const RETIRED_QUESTIONS27: Question27[] = [{
  id: "education",
  section: "Demographics and socioeconomic information",
  text: "What level of formal education have you completed? (check highest level only):",
  source: pure(3, "Q9"),
  options: [
    "None",
    "Primary",
    "Secondary/highschool/higher secondary",
    "Trade School",
    "College/University",
    "Unknown",
  ],
}];
for (const [id, text, unit, min, max] of [
  ["sbp", "Systolic", "mmHg", 50, 320],
  ["dbp", "Diastolic", "mmHg", 20, 200],
  ["pulse", "Heart Rate", "beats/min", 20, 250],
  ["waist", "Waist", "cm", 50, 250],
  ["hip", "Hip", "cm", 50, 250],
] as const) {
  for (const n of [1, 2])
    add({
      id: `${id}${n}`,
      section: "Anthropometric and cardiovascular measurements",
      text: `${text} #${n}`,
      unit,
      min,
      max,
      source: pure(
        35,
        `Q41 ${id === "pulse" ? "(b)" : id === "waist" ? "(c)" : id === "hip" ? "(e)" : "(a)"}`,
      ),
      note:
        id === "sbp" || id === "dbp"
          ? "Sitting — Right arm blood pressure"
          : id === "waist" || id === "hip"
            ? "If subject refuses to provide any of the measures, enter a value of “0” into each of the boxes for that question."
            : "Record the measured value; leave blank when unavailable.",
    });
  if (id === "waist" || id === "hip")
    add({
      id: `${id}Clothing`,
      section: "Anthropometric and cardiovascular measurements",
      text: `${text} — clothing`,
      source: pure(35, "Q41"),
      options: ["minimal/no clothing", "full clothing"],
      note: "Measurement conditions only; not a risk predictor.",
    });
}
for (const [id, text] of [
  ["hypertension", "Hypertension/high blood pressure"],
  ["diabetes", "Diabetes"],
] as const) {
  add({
    id,
    section: "Medical history",
    text,
    sharedPrompt:
      "Have you ever been diagnosed with any of the following? (check all that apply)",
    source: `${pure(9, "Q17")}, printed page 4, row ${id === "diabetes" ? "a" : "b"}`,
    options: ["No", "Yes"],
  });
  add({
    id: `${id}Years`,
    section: "Medical history",
    text: "# of yrs since diagnosis",
    context: text,
    source: `${pure(9, "Q17")}, printed page 4, “# of yrs since diagnosis” column`,
    unit: "years",
    min: 0,
    max: 70,
    when: (a) => yes(a, id),
  });
}
for (const [id, condition] of [
  ["bpMed", "hypertension/high blood pressure"],
  ["lipidMed", "high blood cholesterol"],
  ["diabetesMed", "high blood sugar or diabetes"],
] as const) {
  const taken = (a: Answers27) => yes(a, id) || a[id]?.startsWith("2 =");
  add({
    id,
    section: "Medications",
    text: `Have you ever taken medication for ${condition}?`,
    options: med,
    source: gen(23, "MD02"),
  });
  add({
    id: id + "StartAge",
    section: "Medications",
    text: "At what age did you begin taking medicine for this (99=unk)",
    context: condition,
    source: gen(23, "MD02"),
    unit: "years",
    min: 0,
    max: 99,
    integer: true,
    when: taken,
  });
  if (id === "diabetesMed")
    for (const [key, text] of [
      ["Insulin", "Was insulin your first diabetes medication?"],
      ["Pregnancy", "Did diabetes occur in pregnancy only"],
    ] as const)
      add({
        id: id + key,
        section: "Medications",
        text,
        options: yn,
        source: gen(23, "MD02"),
        when: taken,
      });
}
add({
  id: "siblings",
  section: "Family history",
  text: "Total number of siblings",
  source: pure(33, "Q40(a)"),
  unit: "siblings",
  min: 0,
  max: 99,
  integer: true,
});
for (const condition of ["Coronary Heart Disease", "Stroke"])
  for (const relative of ["Father", "Mother", "Siblings"]) {
    const id = `family_${condition}_${relative}`;
    add({
      id,
      section: "Family history",
      text: relative,
      context: condition,
      sharedPrompt: "Health History: Complete for all parents and siblings, alive or dead",
      source: pure(33, "Q40(b)"),
      options: ["Unknown", "No", "Yes"],
    });
    if (relative === "Siblings")
      add({
        id: id + "_count",
        section: "Family history",
        text: "# of siblings with the condition",
        context: condition,
        source: pure(33, "Q40(b)"),
        unit: "siblings",
        min: 1,
        max: 99,
        integer: true,
        when: (a) => a.siblings !== "0" && a[id] === "Yes",
      });
  }
add({
  id: "alcoholHistory",
  section: "Alcohol consumption",
  text: "Which best describes your history of alcohol use?",
  source: pure(19, "Q28(a)"),
  options: [
    "Formerly used alcohol products",
    "Currently use alcohol products",
    "Never used alcohol products",
  ],
});
const alcoholAsked = (a: Answers27) =>
  ["Formerly used alcohol products", "Currently use alcohol products"].includes(
    a.alcoholHistory,
  );
add({
  id: "alcoholStart",
  section: "Alcohol consumption",
  text: "At what age did you start?",
  source: pure(19, "Q28(b)"),
  unit: "yrs",
  min: 0,
  max: 99,
  integer: true,
  when: alcoholAsked,
});
export const BEVERAGES = [
  ["spirits", "Spirits(rum,whisky, gin,vodka etc)", 30, 0.4],
  ["wine", "Wine", 125, 0.12],
  ["beer", "Beer", 375, 0.05],
  ["country", "Country liquor/arrack/ sugar cane spirit", 30, 0.4],
] as const;
for (const [id, label, ml] of BEVERAGES) {
  add({
    id: `alc_${id}`,
    section: "Alcohol consumption",
    text: label,
    sharedPrompt: "What forms of alcohol have you regularly used? (check all that apply)",
    source: pure(19, "Q28(c)"),
    options: ["Not selected", "Selected"],
    note: `Approx. size of one “drink”: ${ml} ml`,
    when: alcoholAsked,
  });
  const selected = (a: Answers27) =>
    alcoholAsked(a) && a[`alc_${id}`] === "Selected";
  add({
    id: `alc_${id}_frequency`,
    section: "Alcohol consumption",
    text: "Frequency",
    context: label,
    source: pure(19, "Q28(c)"),
    options: ["Daily", "Weekly", "Monthly"],
    when: selected,
  });
  add({
    id: `alc_${id}_quantity`,
    section: "Alcohol consumption",
    text: "Average # of drinks",
    context: label,
    source: pure(19, "Q28(c)"),
    unit: "drinks",
    min: 0,
    max: 999,
    when: selected,
  });
  add({
    id: `alc_${id}_duration`,
    section: "Alcohol consumption",
    text: "Duration (years)",
    context: label,
    source: pure(19, "Q28(c)"),
    unit: "years",
    min: 0,
    max: 70,
    when: selected,
  });
  add({
    id: `alc_${id}_stopped`,
    section: "Alcohol consumption",
    text: "Past users only When Stopped (years ago)",
    context: label,
    source: pure(19, "Q28(c)"),
    unit: "years ago",
    min: 0,
    max: 70,
    when: (a) =>
      selected(a) && a.alcoholHistory === "Formerly used alcohol products",
  });
}
add({
  id: "heavyAlcohol",
  section: "Alcohol consumption",
  text: "At least once a month, do you consume >5 alcoholic drinks/day?",
  source: pure(19, "Q28(d)"),
  options: ["No", "Yes"],
  when: alcoholAsked,
});
for (const [id, text] of [
  [
    "heavyTimes",
    "How many times per month do you consume >5 alcoholic drinks in a day?",
  ],
  [
    "heavyQuantity",
    "What is the average number of drinks that you consume each time?",
  ],
] as const)
  add({
    id,
    section: "Alcohol consumption",
    text,
    source: pure(19, "Q28(d)(i,ii)"),
    unit: id === "heavyTimes" ? "times/month" : "drinks",
    min: 0,
    max: 99,
    when: (a) => alcoholAsked(a) && yes(a, "heavyAlcohol"),
  });
add({
  id: "smokeEver",
  section: "Active smoking",
  text: "Have you ever smoked cigarettes regularly?",
  source: gen(28, "MD07"),
  options: yn,
  note: "No means less than 20 packs of cigarettes or 12oz of tobacco in a lifetime or less than 1 cigarette a day for 1 year.",
});
for (const [id, text] of [
  ["smokeLastYear", "Have you smoked cigarettes regularly in the last year?"],
  ["smokeCurrent", "Do you now smoke cigarettes (as of 1 month ago)?"],
  [
    "smokeBreak",
    "When you were smoking, did you ever stop smoking for >6 months?",
  ],
] as const)
  add({
    id,
    section: "Active smoking",
    text,
    source: gen(28, "MD07"),
    options: yn,
    when: (a) => yes(a, "smokeEver"),
  });
for (const [id, text, unit] of [
  [
    "smokeNow",
    "How many cigarettes do you smoke per day now?",
    "cigarettes/day",
  ],
  [
    "smokeAverage",
    "On the average of the entire time you smoked, how many cigarettes did you smoke per day?",
    "cigarettes/day",
  ],
  [
    "smokeStart",
    "How old were you when you first started regular cigarette smoking? (99=Unk.)",
    "years",
  ],
  [
    "smokeStop",
    "If you have stopped smoking cigarettes completely, how old were you when you stopped? (Age stopped, 00=not stopped, 99=Unk)",
    "years",
  ],
  [
    "smokeBreakYears",
    "For how many years in total did you stop smoking cigarettes (00=never stopped)",
    "years",
  ],
] as const)
  add({
    id,
    section: "Active smoking",
    text,
    source: gen(28, "MD07"),
    unit,
    min: 0,
    max: 99,
    integer: true,
    when: (a) =>
      yes(a, "smokeEver") && (id !== "smokeBreakYears" || yes(a, "smokeBreak")),
  });
add({
  id: "passiveChild",
  section: "Passive smoking",
  text: "In your childhood, did you live with a regular cigarette smoker who smoked in your home?",
  source: gen(29, "MD08"),
  options: yn,
});
for (const [id, text] of [
  ["childMother", "Mother smoked?"],
  ["childFather", "Father smoked?"],
  ["childOther", "Others in Household smoked?"],
] as const)
  add({
    id,
    section: "Passive smoking",
    text,
    source: gen(29, "MD08"),
    options: yn,
    when: (a) => yes(a, "passiveChild"),
  });
add({
  id: "childOtherCount",
  section: "Passive smoking",
  text: "How many others?",
  source: gen(29, "MD08"),
  unit: "people",
  min: 1,
  max: 99,
  integer: true,
  when: (a) => yes(a, "passiveChild") && yes(a, "childOther"),
});
add({
  id: "passiveHome",
  section: "Passive smoking",
  text: "As an adult, now or in the past, have you ever lived with a regular cigarette smoker who smoked in your home?",
  source: gen(29, "MD08"),
  options: yn,
});
add({
  id: "passiveOutside",
  section: "Passive smoking",
  text: "Currently, when you are not at home, do you regularly spend time indoors where there are people smoking cigarettes?",
  source: gen(29, "MD08"),
  options: yn,
});
export const PASSIVE = [
  ["partner", "Spouse or Partner?", "passiveHome"],
  ["otherHome", "Others in household?", "passiveHome"],
  ["work", "At Work?", "passiveOutside"],
  ["otherIndoor", "Other than work?", "passiveOutside"],
] as const;
for (const [id, text, gate] of PASSIVE) {
  add({
    id: "passive_" + id,
    section: "Passive smoking",
    text,
    source: gen(29, "MD08"),
    options: yn,
    when: (a) => yes(a, gate),
  });
  add({
    id: "passive_" + id + "_years",
    section: "Passive smoking",
    text: "Years of exposure",
    context: text,
    source: gen(29, "MD08"),
    unit: "years",
    min: 0,
    max: 70,
    when: (a) => yes(a, gate) && yes(a, "passive_" + id),
  });
}
export const IPAQ_DAYS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
export const IPAQ_ACTIVITY = [2, 4, 6, 10, 12, 14, 16, 18, 20, 22, 24];
for (const q of ipaq) {
  const when = (a: Answers27) =>
    q.number <= 7 && q.number > 1
      ? a.ipaq1 === "Yes" &&
        (![3, 5, 7].includes(q.number) ||
          Number(a["ipaq" + (q.number - 1)]) > 0)
      : [9, 11, 13, 15, 17, 19, 21, 23, 25].includes(q.number)
        ? Number(a["ipaq" + (q.number - 1)]) > 0
        : true;
  const section =
    q.number <= 7
      ? "Physical activity — work"
      : q.number <= 13
        ? "Physical activity — transportation"
        : q.number <= 19
          ? "Physical activity — home"
          : q.number <= 25
            ? "Physical activity — recreation"
            : "Sedentary time";
  if (q.number === 1)
    add({
      id: "ipaq1",
      section,
      text: q.text,
      source: `IPAQ_English_self-admin_long.pdf, PDF ${q.page}, Q1`,
      options: ["Yes", "No"],
      note: "No: Skip to PART 2: TRANSPORTATION",
    });
  else if (IPAQ_DAYS.includes(q.number))
    add({
      id: "ipaq" + q.number,
      section,
      text: q.text,
      source: `IPAQ_English_self-admin_long.pdf, PDF ${q.page}, Q${q.number}`,
      unit: "days per week",
      min: 0,
      max: 7,
      integer: true,
      when,
      note: "No activity: enter 0 and skip the following time question.",
    });
  else
    for (const unit of ["hours", "minutes"])
      add({
        id: `ipaq${q.number}_${unit}`,
        section,
        text: unit === "hours" ? "Hours per day" : "Minutes per day",
        sharedPrompt: q.text,
        source: `IPAQ_English_self-admin_long.pdf, PDF ${q.page}, Q${q.number}`,
        
        min: 0,
        max: unit === "hours" ? 24 : 59,
        integer: true,
        when,
      });
}
add({
  id: "stressWorkApplicable",
  section: "Psychosocial stress",
  text: "Mark here if not applicable: i.e. no longer working",
  source: pure(25, "Q35(a)"),
  options: ["Not marked", "Not applicable"],
});
for (const [id, text] of [
  [
    "stressWork",
    "How often have you felt stress at work in the last 12 months?",
  ],
  [
    "stressHome",
    "How often have you felt stress at home in the last 12 months?",
  ],
] as const)
  add({
    id,
    section: "Psychosocial stress",
    text,
    source: pure(25, "Q35(a,b)"),
    options: stress,
    when: (a) => id !== "stressWork" || a.stressWorkApplicable === "Not marked",
    note: "Stress is defined as feeling irritable or filled with anxiety, or as having sleeping difficulties as a result of conditions at work or at home.",
  });
for (const [id, text] of [
  ["sleep", "Sleep--Number of hours that you typically sleep?"],
  ["sleepSedentary", "Sedentary--Number of hours typically sitting?"],
  [
    "sleepSlight",
    "Slight Activity--Number of hours with activities such as standing, walking?",
  ],
  [
    "sleepModerate",
    "Moderate Activity--Number of hours with activities such as housework (vacuum, dust, yard chores, climbing stairs; light sports such as bowling, golf)?",
  ],
  [
    "sleepHeavy",
    "Heavy Activity--Number of hours with activities such as heavy household work, heavy yard work such as stacking or chopping wood, exercise such as intensive sports--jogging, swimming etc.?",
  ],
] as const)
  add({
    id,
    section: "Sleep and typical-day activity",
    text,
    source: gen(10, "TECH05"),
    unit: "hours",
    min: 0,
    max: 24,
    sharedPrompt: "Rest and Activity for a Typical Day (Activities must equal 24 hours)",
  });
questions.push(...PROTOCOL_QUESTIONS);
// Retain source metadata for saved historical answers; omit only the approved items from new intake.
export const REMOVED_QUESTION_IDS27 = [
  "siblings",
  "longestOccupation",
  "hypertensionYears", "diabetesYears",
  "bpMedStartAge", "lipidMedStartAge", "diabetesMedStartAge",
  "diabetesMedInsulin", "diabetesMedPregnancy",
  "family_Coronary Heart Disease_Siblings_count", "family_Stroke_Siblings_count",
  "alcoholStart", "heavyTimes", "heavyQuantity",
  ...BEVERAGES.flatMap(([id]) => [`alc_${id}_duration`, `alc_${id}_stopped`]),
  "childMother", "childFather", "childOther", "childOtherCount",
  "sleepSedentary", "sleepSlight", "sleepModerate", "sleepHeavy",
  "ipaq8", "ipaq9_hours", "ipaq9_minutes",
];
const removedIds = new Set(REMOVED_QUESTION_IDS27);
RETIRED_QUESTIONS27.push(...questions.filter(q => removedIds.has(q.id)));
export const QUESTIONS27 = questions.filter(q => !removedIds.has(q.id)).map(q =>
  q.id === "sleep" ? { ...q, section: "Sleep", sharedPrompt: undefined,
    note: "Report sleep during a typical day. This is an extracted source item; other daily activities are not collected here." } : q
);
export const FEATURE_NAMES27 = [
  "age_years",
  "sex_male",
  "ses_index_0_100",
  "urban_rural_residence",
  "waist_cm",
  "hip_circumference_cm",
  "sbp_mmhg",
  "dbp_mmhg",
  "heart_rate_bpm",
  "hypertension_history",
  "bp_medication",
  "diabetes",
  "diabetes_medication",
  "lipid_lowering_medication",
  "family_history_cvd",
  "alcohol_ethanol_g_week",
  "heavy_episodic_alcohol",
  "smoking_status",
  "smoking_pack_years",
  "current_smoking_intensity_cigs_day",
  "passive_smoking_childhood",
  "passive_smoking_adult_years",
  "activity_min_week",
  "sitting_minutes_day",
  "diet_score_0_100",
  "psychosocial_stress",
  "sleep_duration_hours",
] as const;
export const isApplicable27 = (q: Question27, a: Answers27) =>
  !q.when || q.when(a);

export type Assessment27Step = { title: string; sections: string[] };
export function assessment27Steps(sections: string[]): Assessment27Step[] {
  const groups: Array<[string, (section: string) => boolean]> = [
    [
      "Demographics and residence",
      (s) => s.includes("Demographics") || s === "Residential classification",
    ],
    ["Measurements", (s) => s.includes("measurements")],
    [
      "Medical and family history",
      (s) => ["Medical history", "Medications", "Family history"].includes(s),
    ],
    ["Alcohol consumption", (s) => s === "Alcohol consumption"],
    ["Smoking", (s) => s.includes("smoking")],
    [
      "Physical activity and sitting",
      (s) => s.startsWith("Physical activity") || s === "Sedentary time",
    ],
    ["Diet", (s) => s === "Dietary questionnaire"],
    [
      "Stress and sleep",
      (s) => s === "Psychosocial stress" || s.includes("Sleep"),
    ],
  ];
  const steps = groups
    .map(([title, matches]) => ({ title, sections: sections.filter(matches) }))
    .filter((step) => step.sections.length);
  const assigned = new Set(steps.flatMap((step) => step.sections));
  const remaining = sections.filter((section) => !assigned.has(section));
  if (remaining.length)
    steps.push({ title: "Additional questions", sections: remaining });
  return steps;
}

export function sanitizeNumericInput(
  value: string,
  integer = false,
): string | null {
  return (integer ? /^\d*$/.test(value) : /^\d*\.?\d*$/.test(value))
    ? value
    : null;
}
function num(a: Answers27, k: string): number | null {
  const raw = a[k];
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function binary(a: Answers27, k: string): number | null {
  return yes(a, k) ? 1 : no(a, k) ? 0 : null;
}
const validAge = (n: number | null) => (n === 99 ? null : n);
export function derive27(a: Answers27, p: Patient) {
  const features: Record<string, number | string | null> = Object.fromEntries(
    FEATURE_NAMES27.map((k) => [k, null]),
  );
  const issues: string[] = [];
  const incomplete: string[] = [];
  for (const q of QUESTIONS27.filter((q) => isApplicable27(q, a))) {
    if (!a[q.id]?.trim()) {
      if (!q.optional) incomplete.push(q.id);
      continue;
    }
    if (q.options && !q.options.includes(a[q.id]))
      issues.push(`${q.id}: select an original response option.`);
    if (q.inputType === "text") continue;
    if (!q.options) {
      const n = num(a, q.id);
      if (
        n === null ||
        n < (q.min ?? 0) ||
        n > (q.max ?? Infinity) ||
        (q.integer && !Number.isInteger(n))
      )
        issues.push(`${q.id}: enter a valid ${q.unit}.`);
    }
  }
  const years = age(p.dob);
  features.age_years = years;
  features.sex_male = p.sex === "Male" ? 1 : p.sex === "Female" ? 0 : null;
  for (const key of [
    "smokeStart",
    "smokeStop",
  ]) {
    const q = QUESTIONS27.find((q) => q.id === key)!;
    const n = validAge(num(a, key));
    if (isApplicable27(q, a) && n !== null && n > years)
      issues.push(`${key}: this value cannot exceed age at assessment.`);
  }
  for (const n of [3, 5, 7, 11, 13, 15, 17, 19, 21, 23, 25, 26, 27]) {
    const q = QUESTIONS27.find((q) => q.id === `ipaq${n}_hours`)!;
    if (
      isApplicable27(q, a) &&
      num(a, `ipaq${n}_hours`) !== null &&
      num(a, `ipaq${n}_minutes`) !== null &&
      Number(a[`ipaq${n}_hours`]) * 60 + Number(a[`ipaq${n}_minutes`]) > 1440
    )
      issues.push(`ipaq${n}_hours: daily duration cannot exceed 24 hours.`);
  }
  if (
    yes(a, "smokeEver") &&
    yes(a, "smokeCurrent") &&
    num(a, "smokeStop") !== null &&
    num(a, "smokeStop") !== 0 &&
    num(a, "smokeStop") !== 99
  )
    issues.push(
      "smokeStop: clarify current smoking and the reported stopping age.",
    );
  const mean = (k: string) => {
    const x = num(a, k + "1"),
      y = num(a, k + "2");
    return x !== null && y !== null && x > 0 && y > 0 ? (x + y) / 2 : null;
  };
  for (const [key, name] of [
    ["sbp", "sbp_mmhg"],
    ["dbp", "dbp_mmhg"],
    ["pulse", "heart_rate_bpm"],
    ["waist", "waist_cm"],
    ["hip", "hip_circumference_cm"],
  ])
    features[name] = mean(key);
  for (const i of [1, 2])
    if (
      num(a, "sbp" + i) !== null &&
      num(a, "dbp" + i) !== null &&
      Number(a["dbp" + i]) >= Number(a["sbp" + i])
    )
      issues.push(
        `dbp${i}: diastolic pressure must be below systolic pressure.`,
      );
  features.hypertension_history = binary(a, "hypertension");
  features.diabetes = binary(a, "diabetes");
  for (const [id, name] of [
    ["bpMed", "bp_medication"],
    ["diabetesMed", "diabetes_medication"],
    ["lipidMed", "lipid_lowering_medication"],
  ])
    features[name] = yes(a, id)
      ? 1
      : no(a, id) || a[id]?.startsWith("2 =")
        ? 0
        : null;
  const fam = QUESTIONS27.filter(
    (q) =>
      q.id.startsWith("family_") &&
      !q.id.endsWith("_count") &&
      isApplicable27(q, a),
  ).map((q) => a[q.id]);
  features.family_history_cvd = fam.includes("Yes")
    ? 1
    : fam.length && fam.every((v) => v === "No")
      ? 0
      : null;
  if (a.alcoholHistory === "Never used alcohol products") {
    features.alcohol_ethanol_g_week = 0;
    features.heavy_episodic_alcohol = 0;
  } else if (a.alcoholHistory === "Currently use alcohol products") {
    let total = 0,
      complete = true,
      selected = 0;
    for (const [id, , ml, abv] of BEVERAGES) {
      if (a[`alc_${id}`] === "Selected") {
        selected++;
        const quantity = num(a, `alc_${id}_quantity`);
        const factor: Record<string, number> = {
          Daily: 7,
          Weekly: 1,
          Monthly: 12 / 52,
        };
        const n = factor[a[`alc_${id}_frequency`]];
        if (quantity === null || !n) complete = false;
        else total += quantity * n * ml * abv * 0.789;
      } else if (a[`alc_${id}`] !== "Not selected") complete = false;
    }
    features.alcohol_ethanol_g_week =
      complete && selected ? Math.round(total * 1e4) / 1e4 : null;
    features.heavy_episodic_alcohol = binary(a, "heavyAlcohol");
  } else if (a.alcoholHistory === "Formerly used alcohol products") {
    features.alcohol_ethanol_g_week = 0;
    features.heavy_episodic_alcohol = binary(a, "heavyAlcohol");
    if (yes(a, "heavyAlcohol"))
      issues.push(
        "heavyAlcohol: clarify current episodes versus formerly used alcohol.",
      );
  }
  if (no(a, "smokeEver")) {
    features.smoking_status = "Never";
    features.smoking_pack_years = 0;
    features.current_smoking_intensity_cigs_day = 0;
  } else if (yes(a, "smokeEver")) {
    features.smoking_status = yes(a, "smokeCurrent")
      ? "Current"
      : no(a, "smokeCurrent")
        ? "Former"
        : null;
    features.current_smoking_intensity_cigs_day = yes(a, "smokeCurrent")
      ? num(a, "smokeNow")
      : no(a, "smokeCurrent")
        ? 0
        : null;
    const start = validAge(num(a, "smokeStart")),
      end = yes(a, "smokeCurrent")
        ? years
        : no(a, "smokeCurrent")
          ? validAge(num(a, "smokeStop"))
          : null;
    const gap = no(a, "smokeBreak")
        ? 0
        : yes(a, "smokeBreak")
          ? num(a, "smokeBreakYears")
          : null,
      average = num(a, "smokeAverage");
    if (start !== null && end !== null && gap !== null && average !== null) {
      if (end > years || end < start || gap > end - start || end === 0)
        issues.push(
          "smokeStart: clarify smoking ages and total years stopped.",
        );
      else features.smoking_pack_years = (average / 20) * (end - start - gap);
    }
  }
  features.passive_smoking_childhood = binary(a, "passiveChild");
  const durations = PASSIVE.map(([id, , gate]) =>
    no(a, gate)
      ? 0
      : yes(a, gate)
        ? no(a, "passive_" + id)
          ? 0
          : yes(a, "passive_" + id)
            ? num(a, "passive_" + id + "_years")
            : null
        : null,
  );
  let passiveBounds: null | [number, number] = null;
  if (durations.every((v) => v !== null)) {
    const ds = durations as number[];
    if (ds.some((v) => v > years - 18))
      issues.push(
        "passiveHome: adult exposure cannot exceed years since age 18.",
      );
    else {
      passiveBounds = [
        Math.max(...ds),
        Math.min(
          years - 18,
          ds.reduce((s, v) => s + v, 0),
        ),
      ];
      // The maximum domain duration is the conservative lower bound on the union;
      // domain periods may overlap and their dates are not collected.
      features.passive_smoking_adult_years = Math.max(...ds);
    }
  }
  const minutes = (n: number) => {
    const h = num(a, `ipaq${n}_hours`),
      m = num(a, `ipaq${n}_minutes`);
    return h === null || m === null ? null : h * 60 + m;
  };
  const weekday = minutes(26),
    weekend = minutes(27);
  if (weekday !== null && weekend !== null) {
    if (weekday > 1440 || weekend > 1440)
      issues.push("ipaq26_hours: sitting duration cannot exceed 24 hours.");
    else features.sitting_minutes_day = (weekday * 5 + weekend * 2) / 7;
  }
  const st = [
    a.stressHome,
    ...(a.stressWorkApplicable === "Not applicable" ? [] : [a.stressWork]),
  ];
  features.psychosocial_stress = st.some((v) => stress.slice(3).includes(v))
    ? 1
    : st.every((v) => stress.slice(1, 3).includes(v))
      ? 0
      : null;
  features.sleep_duration_hours = num(a, "sleep");
  const protocol = additionalFeatures(a, years);
  Object.assign(features, protocol.features);
  const featureProvenance: Record<
    string,
    {
      state: "observed" | "derived" | "assumption-derived" | "unavailable";
      method: string;
    }
  > = {};
  const kinds: Record<string, "observed" | "derived" | "assumption-derived"> = {
    age_years: "observed",
    sex_male: "observed",
    ses_index_0_100: "assumption-derived",
    urban_rural_residence: "observed",
    waist_cm: "derived",
    hip_circumference_cm: "derived",
    sbp_mmhg: "derived",
    dbp_mmhg: "derived",
    heart_rate_bpm: "derived",
    hypertension_history: "observed",
    bp_medication: "derived",
    diabetes: "observed",
    diabetes_medication: "derived",
    lipid_lowering_medication: "derived",
    family_history_cvd: "derived",
    alcohol_ethanol_g_week: "assumption-derived",
    heavy_episodic_alcohol: "observed",
    smoking_status: "derived",
    smoking_pack_years: "derived",
    current_smoking_intensity_cigs_day: "derived",
    passive_smoking_childhood: "observed",
    passive_smoking_adult_years: "derived",
    activity_min_week: "derived",
    sitting_minutes_day: "derived",
    diet_score_0_100: "derived",
    psychosocial_stress: "derived",
    sleep_duration_hours: "observed",
  };
  const methods: Record<string, string> = {
    ses_index_0_100: "PINTIG-SES-1.3: unavailable until suitable reference data, categorical encoding, income treatment and scoring parameters are validated",
    urban_rural_residence: "Explicit PSA barangay class with source provenance",
    waist_cm: "Mean of two observed PURE-form readings",
    hip_circumference_cm: "Mean of two observed PURE-form readings",
    sbp_mmhg: "Mean of two observed PURE-form readings",
    dbp_mmhg: "Mean of two observed PURE-form readings",
    heart_rate_bpm: "Mean of two observed PURE-form readings",
    family_history_cvd:
      "Any-positive composite across applicable CHD/stroke relatives",
    alcohol_ethanol_g_week:
      "PURE frequency × reference volume × assumed ABV × ethanol density",
    smoking_status: "Ever/current response mapping",
    smoking_pack_years:
      "Lifetime cigarettes/day divided by20 × smoking-years net of breaks",
    current_smoking_intensity_cigs_day:
      "Current daily count; confirmed noncurrent maps to zero",
    passive_smoking_adult_years:
      "Maximum reported domain duration; lower bound of union",
    activity_min_week: "IPAQ Long frequency/duration cleaning, weekly minutes",
    sitting_minutes_day: "Weekday/weekend weighted mean",
    diet_score_0_100: "PINTIG Food6 component average",
    psychosocial_stress: "Five PURE categories collapsed to binary threshold",
    sleep_duration_hours: "Gen3 TECH05 typical-day reported sleep",
  };
  for (const key of FEATURE_NAMES27)
    featureProvenance[key] = {
      state: features[key] == null ? "unavailable" : kinds[key],
      method:
        methods[key] ??
        "Direct profile or questionnaire response, encoded per protocol",
    };
  return {
    features,
    featureProvenance,
    issues,
    incomplete,
    passiveBounds,
    protocol,
    modelStatus: "blocked" as const,
    limitations: [
      "No compatible validated 27-feature model is registered.",
      "SES and other questionnaire-derived features are not validated equivalents of synthetic training features.",
      "Alcohol ABV, measurement means and binary stress are explicit PINTIG adaptations.",
      "Overlapping passive exposure cannot be resolved from domain years alone.",
      ...(years === 70
        ? ["IPAQ instrument scope is ages 15–69; assessment age is 70."]
        : []),
    ],
  };
}

export function assertLegacyCompatible(inputs: Record<string, unknown>) {
  if (
    inputs.schema === INTAKE27_SCHEMA ||
    [
      "age_years",
      "smoking_status",
      "alcohol_ethanol_g_week",
      "current_smoking_intensity_cigs_day",
      "smokeEver",
      "sbp1",
    ].some((k) => Object.hasOwn(inputs, k))
  )
    throw new Error(
      "This questionnaire requires a compatible validated model. Risk calculation is unavailable.",
    );
}
