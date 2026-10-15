import test from "node:test";
import assert from "node:assert/strict";
import { patients, records } from "../src/state/store.ts";
import { seededIntake, hasIntakeAnswers } from "../src/state/seededIntakes.ts";
import { age } from "../src/utils/format.ts";
import { generateGuidance } from "../src/services/guidance.ts";
test("three fictional identities and original history remain intact", () => {
  assert.deepEqual(
    patients.slice(0, 3).map((p) => [
      p.id,
      p.record,
      p.first,
      p.middle,
      p.last,
      p.dob,
      p.sex,
      p.locality,
    ]),
    [
      [
        1,
        "PNT-000001",
        "Roberto",
        "M.",
        "Dela Cruz",
        "1968-04-17",
        "Male",
        "Quezon City",
      ],
      [
        2,
        "PNT-000002",
        "Elena",
        "",
        "Reyes",
        "1975-07-08",
        "Female",
        "San Mateo, Rizal",
      ],
      [
        3,
        "PNT-000003",
        "Antonio",
        "",
        "Santos",
        "1982-01-13",
        "Male",
        "Marikina City",
      ],
    ],
  );
  assert.ok(
    patients.every(
      (p) => age(p.dob) >= 35 && age(p.dob) <= 70 && !p.phone && !p.pin,
    ),
  );
  assert.deepEqual(
    records.slice(0, 2).map((r) => [r.id, r.pid, r.date, r.risk, r.model]),
    [
      [1, 1, "2026-09-26", 0.238, "ILLUSTRATIVE-0.2"],
      [2, 2, "2026-09-30", 0.114, "ILLUSTRATIVE-0.2"],
    ],
  );
  assert.equal(records[0].inputs.sbp, "165");
  assert.equal(records[1].inputs.sbp, "145");
});
test("intakes derive BMI, alcohol and activity without assigning model predictions", () => {
  for (const [id, bmi, alcohol, activity, bp, smoking] of [
    [1, "29.1", "4.0", "50", "156", "Yes"],
    [2, "26.5", "0.0", "105", "138", "No"],
    [3, "23.4", "0.0", "200", "118", "No"],
  ]) {
    const x = seededIntake(id);
    assert.equal(x.pid, String(id));
    assert.equal(x.bmi, bmi);
    assert.equal(x.alcoholDrinks, alcohol);
    assert.equal(x.activityMinutes, activity);
    assert.equal(x.sbp, bp);
    assert.equal(x.currentSmoking, smoking);
    assert.equal(x.prior, "No");
    assert.equal(x.verified, "Yes");
    assert.equal(x.mode, "extended");
    assert.ok(+x.sbp > +x.dbp);
    assert.ok(Object.values(x).every((v) => v !== ""));
    assert.equal(x.risk, undefined);
    assert.equal(x.cif, undefined);
  }
  const rules = generateGuidance(seededIntake(1), patients[0]);
  for (const id of [
    "BP-REVIEW",
    "TOBACCO",
    "MED-REVIEW",
    "BMI",
    "ACTIVITY",
    "DIET-SALT",
    "FAMILY",
  ])
    assert.ok(rules.some((r) => r.id === id));
  assert.equal(seededIntake(12), undefined);
  const edited = seededIntake(1);
  edited.sbp = "120";
  assert.equal(seededIntake(1).sbp, "156");
  assert.equal(
    hasIntakeAnswers({ pid: "1", mode: "extended", sbp: "" }),
    false,
  );
  assert.equal(hasIntakeAnswers(edited), true);
});
