import { b, f, head, patientIdent, sel } from "../components/shared";
import { P, patients, S } from "../state/store";
import { age, dt, esc } from "../utils/format";
export function AssessmentPage() {
  let x = S.draft || {},
    p = S.patientId ? P(S.patientId) : null;
  const v = (k: string, d = "") => x[k] ?? d;
  const ynu = [
    ["", "Choose an answer"],
    ["Yes", "Yes"],
    ["No", "No"],
    ["Unknown", "Not sure"],
  ];
  const bmiAuto = Number(x.height) > 0 && Number(x.weight) > 0;
  const alc = v("alcoholDrinks"),
    activity = v("activityMinutes"),
    core = v("mode", "extended") === "observed";
  const num = (
    label: string,
    key: string,
    max: number,
    unit = "",
    required = false,
    step = "1",
  ) =>
    f(
      label + (unit ? " (" + unit + ")" : ""),
      key,
      v(key),
      "number",
      required,
      'min="0" max="' + max + '" step="' + step + '"',
    );
  return (
    <>
      {head(
        "New Risk Assessment",
        "Guided intake · Record measurements and interview responses.",
        b("← Dashboard", "nav:Dashboard"),
      )}
      <section className={"panel"}>
        <form id={"assessmentForm"}>
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
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"02"}</span>
            <div>
              <h2>{"Eligibility questions"}</h2>
              <p>{"Confirm the intended first-event prediction population."}</p>
            </div>
          </div>
          <div className={"gridform"}>
            {sel(
              "Has the patient previously been diagnosed with a heart attack, stroke, or heart failure? *",
              "prior",
              ynu,
              v("prior"),
            )}
            {sel(
              "Is the information sufficient to proceed with the assessment? *",
              "verified",
              ynu,
              v("verified"),
            )}
          </div>
          <p className={"hintline"}>
            {
              "People with a previous component of the target event are outside the intended first-event assessment. Age eligibility is checked automatically."
            }
          </p>
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
                {"Body mass index (BMI, kg/m²) *"}
              </label>
              <div className={"bmi-value-host"}>
                <input
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
            {f(
              "Waist circumference (cm, if available)",
              "waist",
              v("waist"),
              "number",
              false,
              'min="40" max="190" step="0.1"',
            )}
          </div>
          <p className={"hintline"}>
            {
              "BMI is calculated automatically when height and weight are supplied. Otherwise enter an existing verified BMI value."
            }
          </p>
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"04"}</span>
            <div>
              <h2>{"Smoking and medication history"}</h2>
              <p>
                {
                  "Record current smoking and medication use separately from past use."
                }
              </p>
            </div>
          </div>
          <div className={"gridform"}>
            {sel(
              "Has the patient smoked cigarettes during the past month? *",
              "currentSmoking",
              ynu,
              v("currentSmoking"),
            )}
            {sel(
              "Is the patient currently taking medication for high blood pressure? *",
              "bpMeds",
              ynu,
              v("bpMeds"),
            )}
            {sel(
              "Has a healthcare professional previously diagnosed the patient with diabetes?",
              "diabetesHistory",
              ynu,
              v("diabetesHistory"),
            )}
            {sel(
              "Has the patient used blood pressure medication in the past, but not currently?",
              "pastBpMeds",
              ynu,
              v("pastBpMeds"),
            )}
          </div>
          <p className={"hintline"}>
            {
              "Record the patient’s reported history of a professional diabetes diagnosis."
            }
          </p>
          <div className={"intake-section-head"}>
            <span className={"intake-step"}>{"05"}</span>
            <div>
              <h2>{"Lifestyle, diet and family questionnaire"}</h2>
              <p>
                {
                  "Structured responses are converted to compatible indicators when the derivation is supported."
                }
              </p>
            </div>
          </div>
          {sel(
            "Assessment information *",
            "mode",
            [
              ["observed", "Clinical and history information"],
              ["extended", "Clinical, lifestyle and social information"],
            ],
            v("mode", "extended"),
          )}
          <div
            id={"extraQuestionnaire"}
            className={"extra-questionnaire"}
            hidden={core}
          >
            <div className={"question-group"}>
              <div className={"group-title"}>{"Alcohol consumption"}</div>
              <div className={"gridform"}>
                {sel(
                  "Has the patient consumed alcoholic drinks during the past year?",
                  "alcoholUse",
                  ynu,
                  v("alcoholUse"),
                )}
                {num(
                  "On average, how many days per week does the patient drink alcohol?",
                  "alcoholDays",
                  7,
                  "days/week",
                  false,
                )}
                {num(
                  "On a drinking day, approximately how many drinks does the patient have?",
                  "drinksPerDay",
                  30,
                  "drinks/day",
                  false,
                )}
                <div className={"field"}>
                  <label id={"alcoholDrinksLabel"}>
                    {"Estimated drinks per week"}
                  </label>
                  <div
                    className={"derived-text-value"}
                    role={"status"}
                    aria-labelledby={"alcoholDrinksLabel"}
                    data-state={alc !== "" ? "complete" : "pending"}
                  >
                    <span
                      id={"alcoholDrinksDisplay"}
                      className={
                        "derived-main " + (alc === "" ? "placeholder" : "")
                      }
                    >
                      {alc !== ""
                        ? Number(alc).toFixed(1) + " drinks/week"
                        : "Not yet calculated"}
                    </span>
                    <span
                      className={"calc-flag"}
                      id={"alcoholDrinksFlag"}
                      hidden={alc === ""}
                    >
                      {"Calculated"}
                    </span>
                    <input
                      id={"alcoholDrinks"}
                      name={"alcoholDrinks"}
                      type={"hidden"}
                      value={alc}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={"question-group"}>
              <div className={"group-title"}>{"Physical activity"}</div>
              <p className={"hintline"}>
                {
                  "Record the days active and minutes per active day for a typical week."
                }
              </p>
              <div className={"gridform"}>
                {num(
                  "On how many days per week does the patient do moderate physical activity?",
                  "activityDays",
                  7,
                  "days/week",
                  false,
                )}
                {num(
                  "On those days, about how many minutes are spent being active?",
                  "activityPerDay",
                  300,
                  "minutes/day",
                  false,
                )}
                <div className={"field"}>
                  <label id={"activityMinutesLabel"}>
                    {"Estimated activity per week"}
                  </label>
                  <div
                    className={"derived-text-value"}
                    role={"status"}
                    aria-labelledby={"activityMinutesLabel"}
                    data-state={activity !== "" ? "complete" : "pending"}
                  >
                    <span
                      id={"activityMinutesDisplay"}
                      className={
                        "derived-main " + (activity === "" ? "placeholder" : "")
                      }
                    >
                      {activity !== ""
                        ? activity + " min/week"
                        : "Not yet calculated"}
                    </span>
                    <span
                      className={"calc-flag"}
                      id={"activityMinutesFlag"}
                      hidden={activity === ""}
                    >
                      {"Calculated"}
                    </span>
                    <input
                      id={"activityMinutes"}
                      name={"activityMinutes"}
                      type={"hidden"}
                      value={activity}
                      readOnly
                    />
                  </div>
                </div>
                {sel(
                  "Typical walking pace",
                  "walkingPace",
                  [
                    ["", "Not recorded"],
                    ["Slow", "Slow"],
                    ["Average", "Average"],
                    ["Brisk", "Brisk"],
                    ["Unable", "Unable to walk"],
                  ],
                  v("walkingPace"),
                )}
              </div>
            </div>
            <div className={"question-group"}>
              <div className={"group-title"}>{"Diet and nutrition"}</div>
              <p className={"hintline"}>
                {
                  "Record the patient’s usual intake without estimating a dietary score."
                }
              </p>
              <div className={"gridform"}>
                {num(
                  "How many servings of fruits and vegetables does the patient usually eat daily?",
                  "fruitVeg",
                  25,
                  "servings/day",
                  false,
                  "0.5",
                )}
                {num(
                  "How many servings of whole-grain foods does the patient usually eat daily?",
                  "wholeGrain",
                  20,
                  "servings/day",
                  false,
                  "0.5",
                )}
                {sel(
                  "How often does the patient add salt or salty condiments to prepared food?",
                  "saltFrequency",
                  [
                    ["", "Not recorded"],
                    ["Rarely", "Rarely"],
                    ["Sometimes", "Sometimes"],
                    ["Often", "Often"],
                  ],
                  v("saltFrequency"),
                )}
                {sel(
                  "How often does the patient eat packaged or heavily processed food?",
                  "processedFood",
                  [
                    ["", "Not recorded"],
                    ["Rarely", "Rarely"],
                    ["Sometimes", "Sometimes"],
                    ["Often", "Often"],
                  ],
                  v("processedFood"),
                )}
              </div>
            </div>
            <div className={"question-group"}>
              <div className={"group-title"}>{"Family and social history"}</div>
              <div className={"gridform"}>
                {sel(
                  "Has a parent or sibling been diagnosed with heart disease or stroke?",
                  "family",
                  ynu,
                  v("family"),
                )}
                {sel(
                  "What is the highest level of schooling the patient has completed?",
                  "education",
                  [
                    ["", "Not recorded"],
                    ["No formal education", "No formal schooling"],
                    ["Primary", "Elementary / primary school"],
                    ["Secondary", "High school / secondary school"],
                    ["Vocational", "Vocational / technical training"],
                    ["Tertiary", "College / university"],
                    ["Postgraduate", "Postgraduate studies"],
                    ["Prefer not to say", "Prefer not to say"],
                  ],
                  v("education"),
                )}
                {sel(
                  "Current employment status",
                  "employment",
                  [
                    ["", "Not recorded"],
                    ["Employed", "Employed"],
                    ["Self-employed", "Self-employed"],
                    ["Unemployed", "Unemployed"],
                    ["Student", "Student"],
                    ["Retired", "Retired"],
                    ["Other", "Other"],
                    ["Prefer not to say", "Prefer not to say"],
                  ],
                  v("employment"),
                )}
              </div>
            </div>
          </div>
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
                <span>{"Alcohol intake"}</span>
                <strong id={"previewAlcohol"}>
                  {core
                    ? "Not included"
                    : alc !== ""
                      ? Number(alc).toFixed(1) + " drinks/week"
                      : "Not yet calculated"}
                </strong>
              </div>
              <div>
                <span>{"Physical activity"}</span>
                <strong id={"previewActivity"}>
                  {core
                    ? "Not included"
                    : activity !== ""
                      ? activity + " min/week"
                      : "Not yet calculated"}
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
        </form>
      </section>
    </>
  );
}
