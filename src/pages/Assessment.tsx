import { PreAssessmentCheck } from "../components/PreAssessmentCheck";
import { screeningForPatient } from "../services/preAssessment";
import {
  b,
  f,
  head,
  patientIdent,
  sel,
  requiredLabel,
} from "../components/shared";
import { NumericInput } from "../components/NumericInput";
import { P, patients, S } from "../state/store";
import { age, dt, esc } from "../utils/format";
import { seededIntake } from "../state/seededIntakes";
export function AssessmentPage() {
  let x = S.draft || {},
    p = S.patientId ? P(S.patientId) : null;
  const unlocked = !!p && !!screeningForPatient(S.preAssessment, p);
  const v = (k: string, d = "") => x[k] ?? d;
  const ynu = [
    ["", "Choose an answer"],
    ["No", "No"],
    ["Yes", "Yes"],
    ["Unknown", "Unknown"],
  ];
  const bpMedicationOptions = [
    ["", "Choose an answer"],
    ["No", "No"],
    ["Yes", "Yes, now"],
    ["Past", "Yes, not now"],
    ["Unknown", "Unknown"],
  ];
  const bmiAuto = Number(x.height) > 0 && Number(x.weight) > 0;
  return (
    <>
      {head(
        "New Risk Assessment",
        "Guided intake · Record measurements and interview responses.",
        b("← Dashboard", "nav:Dashboard"),
      )}
      <section className={"panel"}>
        <form id={"assessmentForm"} noValidate>
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"01"}</span>
            <div>
              <h2>{"Patient identification"}</h2>
              <p>{"Select the patient before recording the current visit."}</p>
            </div>
          </div>
          {sel(
            "Patient profile *",
            "pid",
            [["", "Choose patient"], ...patients.map((z) => [z.id, z.record])],
            p?.id || "",
          )}
          <div className={"identity-context"} id={"assessmentIdentity"}>
            {patientIdent(p)}
          </div>
          {p && seededIntake(p.id) && (
            <div className="actions">
              {b("Prefill questionnaire", "loadRecordedIntake")}
              <span className="tiny muted">
                Practice responses for this fictional patient. Review before
                submitting.
              </span>
            </div>
          )}
          <div className={"profile-meta-header"}>
            <strong>{"Patient information"}</strong>
            <span className={"source-hint"}>
              {"✓ Retrieved from patient profile · Read-only"}
            </span>
          </div>
          <dl
            className={"patient-baseline"}
            aria-label={
              "Patient information retrieved from the selected profile"
            }
          >
            <div className={"fact-cell"}>
              <dt>{"Date of birth"}</dt>
              <dd id={"patientDob"}>{p ? esc(dt(p.dob)) : "—"}</dd>
            </div>
            <div className={"fact-cell"}>
              <dt>{"Age at assessment"}</dt>
              <dd id={"patientAge"}>{p ? age(p.dob) + " years" : "—"}</dd>
            </div>
            <div className={"fact-cell"}>
              <dt>{"Sex"}</dt>
              <dd id={"patientSex"}>{p ? esc(p.sex) : "—"}</dd>
            </div>
          </dl>
          <PreAssessmentCheck />
          <input type="hidden" name="prior" value={unlocked ? "No" : ""} />
          <input type="hidden" name="verified" value={unlocked ? "Yes" : ""} />
          <fieldset
            className="assessment-predictors"
            hidden={!unlocked}
            disabled={!unlocked}
          >
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"03"}</span>
            <div>
              <h2>{"Clinic measurements"}</h2>
              <p>
                {
                  "Measure blood pressure and body size; do not ask the patient to guess measurement values."
                }
              </p>
            </div>
          </div>
          <div className={"gridform"}>
            {f(
              "Systolic blood pressure (mmHg)",
              "sbp",
              v("sbp"),
              "number",
              true,
              'min="70" max="260" step="1"',
            )}
            {f(
              "Diastolic blood pressure (mmHg)",
              "dbp",
              v("dbp"),
              "number",
              true,
              'min="40" max="160" step="1"',
            )}
            {f(
              "Height (cm)",
              "height",
              v("height"),
              "number",
              false,
              'min="110" max="220" step="0.1"',
            )}
            {f(
              "Weight (kg)",
              "weight",
              v("weight"),
              "number",
              false,
              'min="25" max="250" step="0.1"',
            )}
            <div className={"field"}>
              <label htmlFor={"bmi"} id={"bmiLabel"}>
                {requiredLabel("Body mass index (BMI, kg/m²)", !bmiAuto)}
              </label>
              <div className={"bmi-value-host"}>
                <NumericInput
                  type={"number"}
                  id={"bmi"}
                  name={"bmi"}
                  value={v("bmi")}
                  onChange={() => {}}
                  hidden={bmiAuto}
                  readOnly={bmiAuto}
                  min={"12"}
                  max={"65"}
                  step={"0.1"}
                  required={true}
                />
                <div
                  className={"derived-text-value"}
                  id={"bmiReadout"}
                  role={"status"}
                  aria-labelledby={"bmiLabel"}
                  data-state={"complete"}
                  hidden={!bmiAuto}
                >
                  <span id={"bmiDisplay"} className={"derived-main"}>
                    {v("bmi") + " kg/m²"}
                  </span>
                  <span className={"calc-flag"}>{"Calculated"}</span>
                </div>
              </div>
            </div>

          </div>
          <p className={"hintline"}>
            {
              "BMI is calculated automatically when height and weight are supplied. Otherwise enter an existing verified BMI value."
            }
          </p>
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"04"}</span>
            <div>
              <h2>{"Framingham-aligned risk questions"}</h2>
              <p>
                {
                  "Use the official Framingham question wording and response choices shown below. Unknown responses must be verified before risk calculation."
                }
              </p>
            </div>
          </div>
          <div className={"gridform"}>
            {sel(
              "Do you now smoke cigarettes (as of 1 month ago)? *",
              "currentSmoking",
              ynu,
              v("currentSmoking"),
            )}
            {sel(
              "Have you ever taken medication for hypertension/high blood pressure? *",
              "bpMeds",
              bpMedicationOptions,
              v("bpMeds"),
            )}
          </div>
          <p className={"hintline"}>
            {
              "Framingham response choices for hypertension medication are No, Yes—now, Yes—not now, and Unknown. For PINTIG's current-use model input, only Yes—now is treated as current antihypertensive medication use."
            }
          </p>
          <div className={"derived-panel"} aria-live={"polite"}>
            <div>
              <b>{"Assessment input summary"}</b>
              <p>
                {
                  "Calculated values refresh as you enter measurements and interview responses."
                }
              </p>
            </div>
            <div className={"derived-grid"}>
              <div>
                <span>{"BMI"}</span>
                <strong id={"previewBmi"}>
                  {v("bmi") ? v("bmi") + " kg/m²" : "Not yet provided"}
                </strong>
              </div>
              <div>
                <span>{"Current cigarette smoking"}</span>
                <strong id={"previewSmoking"}>
                  {v("currentSmoking") || "Not yet provided"}
                </strong>
              </div>
              <div>
                <span>{"Hypertension medication"}</span>
                <strong id={"previewBpMeds"}>
                  {v("bpMeds") === "Past"
                    ? "Yes, not now"
                    : v("bpMeds") === "Yes"
                      ? "Yes, now"
                      : v("bpMeds") || "Not yet provided"}
                </strong>
              </div>
            </div>
          </div>
          <p className={"hintline"}>
            {
              "Review the measurements and interview responses with the patient before continuing."
            }
          </p>
          <div className={"actions"}>
            <button className={"btn primary"} type={"submit"}>
              {"Review 10-year risk result →"}
            </button>
            {b("Clear assessment", "resetAssessment")}
          </div>
          </fieldset>
        </form>
      </section>
    </>
  );
}
