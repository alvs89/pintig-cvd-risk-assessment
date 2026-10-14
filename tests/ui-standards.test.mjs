import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { S, users } from "../src/state/store.ts";
import { LoginPage } from "../src/pages/Login.tsx";
import {
  MaintenancePage,
  HelpPage,
  AboutPage,
  AccountPage,
} from "../src/pages/Information.tsx";
import { UserForm } from "../src/pages/Users.tsx";
import { RecordPage } from "../src/pages/History.tsx";
import { ResultsPage } from "../src/pages/Results.tsx";
import { ModelStatus } from "../src/components/ModelStatus.tsx";
import {
  assessmentLabels,
  displayAssessmentValue,
} from "../src/utils/assessmentLabels.ts";

test("normal screens do not expose development terminology or version codes", () => {
  const saved = { ...S };
  try {
    S.user = users[0];
    S.historyId = 1;
    S.editUser = 0;
    S.result = {
      pid: 1,
      ageAtAssessment: 58,
      risk: 0.04,
      bmi: 25,
      parts: [],
      band: "Low",
      saved: false,
      inputs: {
        sbp: "132",
        dbp: "82",
        bmi: "25",
        mode: "observed",
        currentSmoking: "No",
        bpMeds: "No",
      },
      guidanceRules: [],
    };
    for (const component of [
      LoginPage,
      MaintenancePage,
      HelpPage,
      AboutPage,
      AccountPage,
      UserForm,
      RecordPage,
      ResultsPage,
    ]) {
      const text = renderToStaticMarkup(React.createElement(component))
        .replace(/<[^>]*>/g, " ")
        .replace(/\S+@\S+/g, "");
      assert.doesNotMatch(
        text,
        /\b(demo|prototype|snapshot)\b|training environment|example records|sample data|session memory|planned three-tier|ILLUSTRATIVE-\d|GUIDE-RULES/i,
        component.name,
      );
    }
    S.reset = true;
    assert.doesNotMatch(
      renderToStaticMarkup(React.createElement(LoginPage)),
      /offline demonstration|OTP is planned|Use a demo account/i,
    );
  } finally {
    Object.assign(S, saved);
  }
});
test("result status remains explicit and recorded fields use healthcare labels", () => {
  const status = renderToStaticMarkup(React.createElement(ModelStatus));
  assert.match(status, /Illustrative estimate/);
  assert.match(status, /not a clinically validated prediction/);
  assert.equal(assessmentLabels.sbp, "Systolic blood pressure");
  assert.equal(displayAssessmentValue("sbp", "132", "PNT-000001"), "132 mmHg");
  assert.equal(displayAssessmentValue("pid", "1", "PNT-000001"), "PNT-000001");
  assert.equal(
    displayAssessmentValue("mode", "extended", ""),
    "Clinical and lifestyle information",
  );
});
