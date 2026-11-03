import fs from "node:fs";
import {
  QUESTIONS27,
  FEATURE_NAMES27,
  INTAKE27_SCHEMA,
  RETIRED_QUESTIONS27,
} from "../src/services/assessment27.ts";
import { FEATURE_PROTOCOL_VERSION } from "../src/services/featureProtocolV1.ts";

// Run with node --import tsx scripts/export-assessment27-dictionary.mjs.
// Documentation only: never reads patient records or research datasets.
const root = "docs/assessment27";
const questions = QUESTIONS27.map(({ when, ...q }) => ({
  ...q,
  applicability: when ? when.toString() : "Always applicable",
  missing:
    "Blank remains missing; original unknown/refusal codes remain in raw responses.",
  bounds:
    "UI plausibility checks are PINTIG adaptations, not source response codes.",
}));
fs.writeFileSync(
  `${root}/questionnaire_dictionary.json`,
  JSON.stringify(
    {
      schema: INTAKE27_SCHEMA,
      featureProtocol: FEATURE_PROTOCOL_VERSION,
      retiredQuestions: RETIRED_QUESTIONS27,
      predictors: FEATURE_NAMES27,
      questions,
      note: "Executable skip logic is authoritative in assessment27.ts. Displayed labels expand grid headings; selector states represent source checkboxes. See MAPPING.md for unsupported features and proposed calculations.",
    },
    null,
    2,
  ) + "\n",
);
const rows = fs
  .readFileSync(`${root}/MAPPING.md`, "utf8")
  .split("\n")
  .filter(
    (line) =>
      line.startsWith("| ") &&
      FEATURE_NAMES27.includes(line.split("|")[1].trim()),
  )
  .map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((value) => value.trim()),
  );
if (rows.length !== 27) throw Error("Expected 27 mapped features");
const quote = (s) => `"${s.replaceAll('"', '""')}"`;
fs.writeFileSync(
  `${root}/feature_dictionary.csv`,
  [
    [
      "feature",
      "source_and_unit",
      "encoding_and_missingness",
      "compatibility_and_provenance",
    ],
    ...rows,
  ]
    .map((row) => row.map(quote).join(","))
    .join("\n") + "\n",
);
console.log(
  `Exported ${questions.length} response fields and ${rows.length} predictor definitions.`,
);
