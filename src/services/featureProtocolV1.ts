import { householdSes, SES_QUESTIONS } from "./sesProtocol";
import type { Answers27, Question27 } from "./assessment27";

export const FEATURE_PROTOCOL_VERSION = "PINTIG-FE-1.1";
export const EDUCATION_OPTIONS = [
  "0 = no schooling",
  "1 = grades 1-8",
  "2 = grades 9-11",
  "3 = completed high school (12th grade) or GED",
  "4 = some college but no degree",
  "5 = technical school certificate",
  "6 = associate degree (Junior college AA, AS)",
  "7 = Bachelor’s degree (BA, AB, BS)",
  "8 = graduate or professional degree (master’s, doctorate, MD, etc.)",
  "9 = prefer not to answer",
] as const;
export const FOOD_FREQUENCIES = [
  "Never, or less than once per month",
  "1-3 per mo.",
  "1 per week",
  "2-4 per week",
  "5-6 per week",
  "1 per day",
  "2-3 per day",
  "4-5 per day",
  "6+ per day",
] as const;
export const FOOD_DAILY = [
  0,
  2 / (365.25 / 12),
  1 / 7,
  3 / 7,
  5.5 / 7,
  1,
  2.5,
  4.5,
  6,
];
type Food = {
  id: string;
  text: string;
  page: number;
  group: "fruit" | "vegetables" | "grain" | "nuts" | "sweet" | "meat";
  factor: number;
};
// Original FFQ Q3 portions retained. Selection/grouping/factors are PINTIG adaptations.
export const FOODS: Food[] = [
  ...[
    ["raisins", "Raisins (1 oz. or small pack) or grapes"],
    ["prunes", "Prunes (½ cup)"],
    ["banana", "Bananas (1)"],
    ["cantaloupe", "Cantaloupe (¼ melon)"],
    ["watermelon", "Watermelon (1 slice)"],
    ["apple", "Fresh apples or pears (1)"],
    ["orange", "Oranges (1)"],
    ["grapefruit", "Grapefruit (½)"],
    ["strawberry", "Strawberries, fresh, frozen or canned (½ cup)"],
    ["blueberry", "Blueberries, fresh, frozen or canned (½ cup)"],
    ["peach", "Peaches, apricots or plums (1 fresh, or ½ cup canned)"],
  ].map(([id, text]) => ({
    id,
    text,
    page: 2,
    group: "fruit" as const,
    factor: 1,
  })),
  ...[
    ["tomato", "Tomatoes (1)"],
    ["tomatoSauce", "Tomato sauce (½ cup) e.g., spaghetti sauce"],
    ["stringBeans", "String beans (½ cup)"],
    ["broccoli", "Broccoli (½ cup)"],
    ["cabbage", "Cabbage or cole slaw (½ cup)"],
    ["cauliflower", "Cauliflower (½ cup)"],
    ["brussels", "Brussels sprouts (½ cup)"],
    ["carrotRaw", "Carrots, raw (½ carrot or 2-4 sticks)"],
    ["carrotCooked", "Carrots, cooked (½ cup)"],
    ["mixedVeg", "Mixed vegetables (½ cup)"],
    ["squash", "Yellow (winter) squash (½ cup)"],
    ["zucchini", "Eggplant, zucchini, or other summer squash (½ cup)"],
    ["spinachCooked", "Spinach, cooked (½ cup)"],
    ["spinachRaw", "Spinach, raw as in salad"],
    ["kale", "Kale, mustard or chard greens (½ cup)"],
    ["lettuce", "Iceberg or head lettuce (serving)"],
    ["romaine", "Romaine or leaf lettuce (serving)"],
    ["celery", "Celery (4″ stick)"],
    ["beets", "Beets (½ cup)"],
    ["sprouts", "Alfalfa sprouts (½ cup)"],
  ].map(([id, text]) => ({
    id,
    text,
    page: 2,
    group: "vegetables" as const,
    factor: 1,
  })),
  ...[
    ["oats", "Cooked oatmeal (1 cup)"],
    ["brownRice", "Brown rice (1 cup)"],
  ].map(([id, text]) => ({
    id,
    text,
    page: 3,
    group: "grain" as const,
    factor: 2,
  })),
  {
    id: "tofu",
    text: "Tofu or soybeans (3-4 oz.)",
    page: 2,
    group: "nuts",
    factor: 1,
  },
  {
    id: "beans",
    text: "Beans or lentils, baked or dried (½ cup)",
    page: 2,
    group: "nuts",
    factor: 1,
  },
  {
    id: "peanutButter",
    text: "Peanut butter (Tbs)",
    page: 4,
    group: "nuts",
    factor: 1,
  },
  {
    id: "nuts",
    text: "Nuts (small packet or 1 oz.)",
    page: 4,
    group: "nuts",
    factor: 1,
  },
  ...[
    ["appleJuice", "Apple juice or cider (small glass)"],
    ["orangeJuice", "Orange juice (small glass)"],
    ["grapefruitJuice", "Grapefruit juice (small glass)"],
    ["otherJuice", "Other fruit juices (small glass)"],
  ].map(([id, text]) => ({
    id,
    text,
    page: 2,
    group: "sweet" as const,
    factor: 1,
  })),
  ...[
    ["cola", "Coke, Pepsi, or other cola with sugar"],
    ["colaNoCaffeine", "Caffeine Free Coke, Pepsi, or other cola with sugar"],
    [
      "otherSoda",
      "Other carbonated beverage with sugar, e.g., 7-Up, ginger ale",
    ],
    [
      "punch",
      "Hawaiian Punch, lemonade, or other non-carbonated fruit drinks (1 glass, bottle, can)",
    ],
  ].map(([id, text]) => ({
    id,
    text,
    page: 3,
    group: "sweet" as const,
    factor: 1,
  })),
  { id: "bacon", text: "Bacon (2 slices)", page: 2, group: "meat", factor: 1 },
  { id: "hotDog", text: "Hot dogs (1)", page: 2, group: "meat", factor: 1 },
  ...[
    [
      "processedMeat",
      "Processed meats, e.g., sausage, salami, bologna, etc. (piece or slice)",
    ],
    ["hamburger", "Hamburger (1 patty)"],
    [
      "sandwichMeat",
      "Beef, pork, or lamb as a sandwich or mixed dish, e.g., stew, casserole, lasagne, etc.",
    ],
    [
      "mainMeat",
      "Beef, pork, or lamb as a main dish, e.g., steak, roast, ham, etc. (4-6 oz.)",
    ],
  ].map(([id, text]) => ({
    id,
    text,
    page: 3,
    group: "meat" as const,
    factor: 1,
  })),
];

export const PROTOCOL_QUESTIONS: Question27[] = [
  {
    id: "gen3Education",
    section: "Demographics and socioeconomic information",
    text: "What is the highest degree or level of school you have completed?",
    source: "Gen-3-Exam-1.pdf, PDF 5, SA01, education (unnumbered)",
    options: EDUCATION_OPTIONS,
    note: "If currently enrolled, mark the highest grade completed, degree received. Educational attainment alone does not describe all socioeconomic circumstances.",
  },
  ...SES_QUESTIONS,
  {
    id: "residenceClass",
    section: "Residential classification",
    text: "Recorded classification of the patient’s barangay",
    source:
      "PINTIG administrative item; PSA urban/rural classification; no questionnaire PDF item",
    options: ["Rural", "Urban", "Unavailable"],
    note: "Use an official classification, not an inference from the address.",
  },
  {
    id: "residenceReference",
    section: "Residential classification",
    text: "Classification source, reference year and geographic code",
    source: "PINTIG administrative provenance; no questionnaire PDF item",
    inputType: "text",
    when: (a) => ["Rural", "Urban"].includes(a.residenceClass),
    note: "Record the official source and barangay code, without entering a street address.",
  },
  ...FOODS.map((f) => ({
    id: "ffq_" + f.id,
    section: "Dietary questionnaire",
    text: f.text,
    source: `Exam-7-Food-Frequency-Questionnaire.pdf, PDF ${f.page}, Q3, ${f.group} row`,
    options: FOOD_FREQUENCIES,
    sharedPrompt: "Please fill in your average use, during the past year, of each specified food.",
  })),
];

const number = (a: Answers27, k: string) =>
  a[k]?.trim() && Number.isFinite(Number(a[k])) ? Number(a[k]) : null;
const clip = (x: number) => Math.max(0, Math.min(1, x));
export function educationIndex(a: Answers27): number | null {
  const i = EDUCATION_OPTIONS.indexOf(
    a.gen3Education as (typeof EDUCATION_OPTIONS)[number],
  );
  return i >= 0 && i < 9 ? (100 * i) / 8 : null;
}
export function foodScore(a: Answers27) {
  const totals = {
    fruit: 0,
    vegetables: 0,
    grain: 0,
    nuts: 0,
    sweet: 0,
    meat: 0,
  };
  const missing: string[] = [];
  for (const f of FOODS) {
    const i = FOOD_FREQUENCIES.indexOf(
      a["ffq_" + f.id] as (typeof FOOD_FREQUENCIES)[number],
    );
    if (i < 0) missing.push("ffq_" + f.id);
    else totals[f.group] += FOOD_DAILY[i] * f.factor;
  }
  const components = {
    vegetables: clip(totals.vegetables / 5),
    fruit: clip(totals.fruit / 4),
    grain: clip(totals.grain / 3),
    nuts: clip(totals.nuts),
    sweet: clip(1 - totals.sweet),
    meat: clip(1 - totals.meat / 1.5),
  };
  return {
    score: missing.length
      ? null
      : (100 * Object.values(components).reduce((s, x) => s + x, 0)) / 6,
    totals,
    components,
    missing,
    method: "PINTIG-Food6; not full AHEI or DASH",
  };
}

// IPAQ Long Form: vigorous yard work and cycling belong to moderate scoring.
export const ACTIVITY_DOMAINS = [
  [2, "vigorous", 8],
  [4, "moderate", 4],
  [6, "walking", 3.3],
  [10, "moderate", 6],
  [12, "walking", 3.3],
  [14, "moderate", 5.5],
  [16, "moderate", 4],
  [18, "moderate", 3],
  [20, "walking", 3.3],
  [22, "vigorous", 8],
  [24, "moderate", 4],
] as const;
export function ipaqScore(a: Answers27) {
  const rows: {
    q: number;
    group: string;
    met: number;
    days: number;
    minutes: number;
  }[] = [];
  for (const [q, group, met] of ACTIVITY_DOMAINS) {
    if (q <= 6 && a.ipaq1 === "No") {
      rows.push({ q, group, met, days: 0, minutes: 0 });
      continue;
    }
    if (q <= 6 && a.ipaq1 !== "Yes")
      return {
        minutes: null,
        metMinutes: null,
        reason: "Missing work gate",
        rows: [],
      };
    const days = number(a, "ipaq" + q);
    if (days === null || !Number.isInteger(days) || days < 0 || days > 7)
      return {
        minutes: null,
        metMinutes: null,
        reason: "Missing or invalid activity days",
        rows: [],
      };
    const h = number(a, `ipaq${q + 1}_hours`),
      m = number(a, `ipaq${q + 1}_minutes`);
    if (days === 0) {
      rows.push({ q, group, met, days: 0, minutes: 0 });
      continue;
    }
    if (
      h === null ||
      m === null ||
      h < 0 ||
      h > 24 ||
      m < 0 ||
      m > 59 ||
      !Number.isInteger(h) ||
      !Number.isInteger(m) ||
      h * 60 + m > 1440
    )
      return {
        minutes: null,
        metMinutes: null,
        reason: "Missing or invalid activity duration",
        rows: [],
      };
    rows.push({ q, group, met, days, minutes: Math.min(180, h * 60 + m) });
  }
  if (rows.reduce((s, r) => s + r.minutes, 0) > 960)
    return {
      minutes: null,
      metMinutes: null,
      reason: "Excluded: summed daily durations exceed 960 minutes",
      rows,
    };
  const clean = rows.map((r) => ({
    ...r,
    minutes: r.minutes < 10 ? 0 : r.minutes,
  }));
  let minutes = 0,
    metMinutes = 0;
  for (const group of ["walking", "moderate", "vigorous"]) {
    const groupRows = clean.filter((r) => r.group === group);
    const weeklyMinutes = groupRows.reduce(
      (sum, r) => sum + r.minutes * r.days,
      0,
    );
    const capScale = weeklyMinutes > 1260 ? 1260 / weeklyMinutes : 1;
    for (const r of groupRows) {
      minutes += r.minutes * r.days * capScale;
      metMinutes += r.minutes * r.days * r.met * capScale;
    }
  }
  return { minutes, metMinutes, reason: null, rows };
}

export function additionalFeatures(a: Answers27, ageYears?: number) {
  const diet = foodScore(a),
    activity = ipaqScore(a);
  if (ageYears !== undefined && ageYears > 69) {
    activity.minutes = null;
    activity.metMinutes = null;
    activity.reason =
      "IPAQ Long Form scope is ages 15-69; age 70 is outside the instrument scope.";
  }
  return {
    features: {
      ses_index_0_100: householdSes(a, educationIndex(a)).score,
      diet_score_0_100: diet.score,
      urban_rural_residence: a.residenceReference?.trim()
        ? a.residenceClass === "Urban"
          ? 1
          : a.residenceClass === "Rural"
            ? 0
            : null
        : null,
      activity_min_week: activity.minutes,
    },
    ses: householdSes(a, educationIndex(a)),
    diet,
    activity,
  };
}
