import type { AssessmentInputs, Patient } from "../types/domain";
import { deriveInputs } from "../services/intake";
import { simulate } from "../services/prediction";
import { createSnapshot } from "../services/snapshots";
import { generateGuidance } from "../services/guidance";
import { age } from "../utils/format";
import { band } from "../utils/risk";

// Entirely fictional practice population, never research participants or clinical records.
// No desired category or probability is stored: the unchanged calculator determines both.
const profiles: [number, string, string, string, string, string][] = [
  [4, "Liza", "Mendoza", "1971-03-12", "Female", "Pasig City"],
  [5, "Paolo", "Villanueva", "1988-06-21", "Male", "Antipolo City"],
  [6, "Marites", "Navarro", "1980-02-09", "Female", "Cainta, Rizal"],
  [7, "Corazon", "Bautista", "1966-05-18", "Female", "Quezon City"],
  [8, "Dennis", "Aquino", "1982-08-03", "Male", "Mandaluyong City"],
  [9, "Rosalinda", "Mercado", "1969-04-25", "Female", "Marikina City"],
  [10, "Ernesto", "Soriano", "1961-01-22", "Male", "San Mateo, Rizal"],
  [11, "Teresita", "Ramos", "1957-07-14", "Female", "Pasig City"],
];
export function isAdditionalFictionalPatient(patient: Patient): boolean {
  return profiles.some(
    ([id, first, last, dob, sex, locality]) =>
      patient.id === id &&
      patient.record === `PNT-${String(id).padStart(6, "0")}` &&
      patient.first === first &&
      patient.middle === "" &&
      patient.last === last &&
      patient.dob === dob &&
      patient.sex === sex &&
      patient.locality === locality &&
      patient.facility === "Community Health Center" &&
      patient.phone === "" &&
      patient.pin === "",
  );
}
const base: AssessmentInputs = {
  prior: "No",
  verified: "Yes",
  mode: "extended",
  pastBpMeds: "No",
  currentSmoking: "No",
  bpMeds: "No",
  diabetesHistory: "No",
  alcoholUse: "No",
  alcoholDays: "0",
  drinksPerDay: "0",
  activityDays: "5",
  activityPerDay: "40",
  walkingPace: "Brisk",
  fruitVeg: "4",
  wholeGrain: "2",
  saltFrequency: "Rarely",
  processedFood: "Rarely",
  family: "No",
  education: "Tertiary",
  employment: "Employed",
};
export const additionalIntakes: Record<number, AssessmentInputs> = {
  4: {
    ...base,
    sbp: "110",
    dbp: "72",
    height: "158",
    weight: "57",
    waist: "75",
    activityDays: "5",
    activityPerDay: "60",
    employment: "Self-employed",
  },
  5: {
    ...base,
    sbp: "118",
    dbp: "76",
    height: "174",
    weight: "70",
    waist: "81",
    alcoholUse: "Yes",
    alcoholDays: "1",
    drinksPerDay: "1",
    education: "Vocational",
  },
  6: {
    ...base,
    sbp: "132",
    dbp: "84",
    height: "160",
    weight: "67",
    waist: "87",
    activityDays: "3",
    activityPerDay: "40",
    walkingPace: "Average",
    fruitVeg: "3",
    saltFrequency: "Sometimes",
    processedFood: "Sometimes",
    family: "Yes",
  },
  7: {
    ...base,
    sbp: "118",
    dbp: "78",
    height: "155",
    weight: "58",
    waist: "79",
    activityDays: "5",
    activityPerDay: "60",
    employment: "Retired",
    education: "Secondary",
  },
  8: {
    ...base,
    sbp: "148",
    dbp: "92",
    height: "170",
    weight: "81",
    waist: "98",
    currentSmoking: "Yes",
    bpMeds: "Yes",
    alcoholUse: "Yes",
    alcoholDays: "2",
    drinksPerDay: "2",
    activityDays: "4",
    activityPerDay: "25",
    walkingPace: "Average",
    fruitVeg: "2",
    wholeGrain: "1",
    saltFrequency: "Often",
    processedFood: "Sometimes",
    family: "Yes",
    education: "Secondary",
    employment: "Self-employed",
  },
  9: {
    ...base,
    sbp: "150",
    dbp: "90",
    height: "157",
    weight: "74",
    waist: "96",
    bpMeds: "Yes",
    diabetesHistory: "Yes",
    activityDays: "3",
    activityPerDay: "30",
    walkingPace: "Average",
    fruitVeg: "2",
    wholeGrain: "1",
    saltFrequency: "Sometimes",
    processedFood: "Often",
    family: "Yes",
    education: "Vocational",
    employment: "Self-employed",
  },
  10: {
    ...base,
    sbp: "178",
    dbp: "102",
    height: "167",
    weight: "94",
    waist: "111",
    currentSmoking: "Yes",
    bpMeds: "Yes",
    diabetesHistory: "Yes",
    alcoholUse: "Yes",
    alcoholDays: "3",
    drinksPerDay: "2",
    activityDays: "2",
    activityPerDay: "20",
    walkingPace: "Slow",
    fruitVeg: "2",
    wholeGrain: "1",
    saltFrequency: "Often",
    processedFood: "Often",
    family: "Yes",
    education: "Primary",
    employment: "Retired",
  },
  11: {
    ...base,
    sbp: "176",
    dbp: "98",
    height: "153",
    weight: "75",
    waist: "104",
    currentSmoking: "Yes",
    bpMeds: "Yes",
    diabetesHistory: "Yes",
    activityDays: "2",
    activityPerDay: "25",
    walkingPace: "Slow",
    fruitVeg: "2",
    wholeGrain: "1",
    saltFrequency: "Often",
    processedFood: "Sometimes",
    family: "Yes",
    education: "Secondary",
    employment: "Retired",
  },
};

/** Pure factory: returns fresh objects, never appends to shared state on render/HMR.
 * Snapshots use the same current-date age and date policy as manual assessments.
 */
export function createAdditionalPopulation() {
  const patients: Patient[] = profiles.map(
    ([id, first, last, dob, sex, locality]) => ({
      id,
      record: `PNT-${String(id).padStart(6, "0")}`,
      first,
      middle: "",
      last,
      dob,
      sex,
      locality,
      phone: "",
      pin: "",
      facility: "Community Health Center",
    }),
  );
  const records = patients.map((patient) => {
    const inputs = deriveInputs({
      ...additionalIntakes[patient.id],
      pid: String(patient.id),
    });
    const prediction = simulate(inputs, patient);
    return createSnapshot(
      {
        ...prediction,
        pid: patient.id,
        inputs,
        band: band(prediction.risk),
        ageAtAssessment: age(patient.dob),
        saved: true,
        guidanceRules: generateGuidance(inputs, patient),
      },
      patient.id - 1,
      patient.id % 2 ? 2 : 1,
    );
  });
  return { patients, records };
}
