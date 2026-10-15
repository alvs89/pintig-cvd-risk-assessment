import { Fragment } from "react";
import { TenYearProbabilityChart } from "../components/TenYearProbabilityChart";
import { FurtherAssessmentPanel } from "../components/FurtherAssessmentPanel";
import { furtherAssessment } from "../services/furtherAssessment";
import { prototypeFollowUp } from "../services/prototypeFollowUp";
import { styleFromText, withKeys } from "../components/markup";
import { b, guidanceHtml, head, patientIdent, tag } from "../components/shared";
import { generateGuidance } from "../services/guidance";
import { ModelStatus } from "../components/ModelStatus";
import { CumulativeIncidencePanel } from "../components/CumulativeIncidencePanel";
import { ResearchCigPanel } from "../components/ResearchCigPanel";
import { AssessmentVisualizations } from "../components/AssessmentVisualizations";
import { P, S } from "../state/store";
import { screeningForPatient } from "../services/preAssessment";
import { esc } from "../utils/format";
export function ResultsPage() {
  let r = S.result!,
    p = P(r.pid)!,
    guid = r.guidanceRules || generateGuidance(r.inputs, p);
  return (
    <>
      {head(
        "Assessment Result",
        p.record + " · 10-year assessment",
        b("← New Assessment", "nav:New Risk Assessment"),
      )}
      <div className={"identity-context"}>{patientIdent(p)}</div>
      <ModelStatus />
      <div className={"twocol"}>
        <div className={"panel"}>
          <div className={"eyebrow"}>
            {"Estimated 10-year major cardiovascular event risk"}
          </div>
          <div className={"risk"}>
            {(r.risk * 100).toFixed(1)}
            {"%"}
          </div>
          {tag(r.band)}
          <TenYearProbabilityChart risk={r.risk} />
          <div className={"progress"}>
            <div
              style={styleFromText(
                "width:" + Math.min(100, r.risk * 250) + "%",
              )}
            ></div>
          </div>
          <div className={"threshold-box"}>
            <div className={"threshold-title"}>
              {"Risk Classification Thresholds"}
            </div>
            <div className={"threshold-grid"}>
              <div
                className={
                  "threshold-item" + (r.band === "Low" ? " active" : "")
                }
              >
                <span className={"label"}>{"Low"}</span>
                <span className={"range"}>{"< 5%"}</span>
              </div>
              <div
                className={
                  "threshold-item" + (r.band === "Moderate" ? " active" : "")
                }
              >
                <span className={"label"}>{"Moderate"}</span>
                <span className={"range"}>{"5% to < 10%"}</span>
              </div>
              <div
                className={
                  "threshold-item" + (r.band === "High" ? " active" : "")
                }
              >
                <span className={"label"}>{"High"}</span>
                <span className={"range"}>{"10% to < 20%"}</span>
              </div>
              <div
                className={
                  "threshold-item" + (r.band === "Very High" ? " active" : "")
                }
              >
                <span className={"label"}>{"Very High"}</span>
                <span className={"range"}>{"≥ 20%"}</span>
              </div>
            </div>
          </div>
          <h3>{"Intended research outcome"}</h3>
          <p className={"tiny"}>
            {
              "The proposed PURE Philippines model targets a first heart attack, stroke, heart failure, or cardiovascular death within 10 years, accounting for non-cardiovascular death. It is not the source of this illustrative estimate."
            }
          </p>
        </div>
        <div className={"panel"}>
          <h2>{"Factors associated with this estimate"}</h2>
          <p className={"muted tiny"}>
            {
              "These factors describe the calculation used for the displayed estimate; they do not establish cause and effect."
            }
          </p>
          <AssessmentVisualizations
            risk={r.risk}
            category={r.band}
            parts={r.parts}
          />
        </div>
      </div>
      <ResearchCigPanel
        patient={p}
        result={r}
        screening={screeningForPatient(S.preAssessment, p)}
      />
      <CumulativeIncidencePanel
        compatibleOnly
        risk={r.risk}
        patientId={r.pid}
        cif={r.cif}
        predictionContext={r.predictionContext}
      />
      <FurtherAssessmentPanel
        result={furtherAssessment(r.risk, r.band)}
        prototype={prototypeFollowUp(r.risk, r.band, r.inputs)}
      />
      <section className={"panel"}>
        <div className={"section-divider"}>
          <h2>{"General Educational Guidance"}</h2>
          <span className={"tag"}>{"Condition-based guidance"}</span>
        </div>
        <p className={"muted"}>
          {
            "Educational guidance is based on recorded health factors and generated separately from the risk estimate."
          }
        </p>
        {guidanceHtml(guid)}
        <p className={"tiny muted"}>
          {
            "The risk category is not used as a medication or referral threshold."
          }
        </p>
      </section>
      <div className={"panel"}>
        <h2>{"Recorded assessment inputs"}</h2>
        <div className={"threecol"}>
          {withKeys(
            [
              ["Age at assessment", r.ageAtAssessment + " years"],
              ["Sex", p.sex],
              ["Currently smokes", r.inputs.currentSmoking],
              ["BP medication", r.inputs.bpMeds],
              ["Systolic BP", r.inputs.sbp + " mmHg"],
              ["Diastolic BP", r.inputs.dbp + " mmHg"],
              ["BMI", r.inputs.bmi + " kg/m²"],
              [
                "History of diabetes diagnosis",
                r.inputs.diabetesHistory || "Not recorded",
              ],
              [
                "Activity",
                r.inputs.mode === "extended" && r.inputs.activityMinutes !== ""
                  ? r.inputs.activityMinutes + " minutes/week"
                  : "Not recorded",
              ],
              [
                "Alcohol intake",
                r.inputs.mode === "extended" && r.inputs.alcoholDrinks !== ""
                  ? r.inputs.alcoholDrinks + " drinks/week"
                  : "Not recorded",
              ],
              [
                "Fruit and vegetables",
                r.inputs.mode === "extended" && r.inputs.fruitVeg !== ""
                  ? r.inputs.fruitVeg + " servings/day"
                  : "Not recorded",
              ],
              [
                "Whole grains",
                r.inputs.mode === "extended" && r.inputs.wholeGrain !== ""
                  ? r.inputs.wholeGrain + " servings/day"
                  : "Not recorded",
              ],
              [
                "Added salt",
                r.inputs.mode === "extended"
                  ? r.inputs.saltFrequency || "Not recorded"
                  : "Not recorded",
              ],
              [
                "Family history",
                r.inputs.mode === "extended"
                  ? r.inputs.family || "Not recorded"
                  : "Not recorded",
              ],
              [
                "Education",
                r.inputs.mode === "extended"
                  ? r.inputs.education || "Not recorded"
                  : "Not recorded",
              ],
            ].map(([k, v], _index) => (
              <Fragment key={_index}>
                <div className={"snapshot"}>
                  <strong>{esc(k)}</strong>
                  {esc(v)}
                </div>
              </Fragment>
            )),
          )}
        </div>
      </div>
      <div className={"panel"}>
        <h2>{"Assessment details"}</h2>
        <div className={"threecol"}>
          <div className={"snapshot"}>
            <strong>{"Patient"}</strong>
            {p.record}
          </div>
          <div className={"snapshot"}>
            <strong>{"Age at assessment"}</strong>
            {r.ageAtAssessment}
            {" years"}
          </div>
          <div className={"snapshot"}>
            <strong>{"Prediction horizon"}</strong>
            {"10 years"}
          </div>
          <div className={"snapshot"}>
            <strong>{"Assessment information"}</strong>
            {r.inputs.mode === "extended"
              ? "Clinical and lifestyle information"
              : "Clinical information"}
          </div>
          <div className={"snapshot"}>
            <strong>{"Educational guidance"}</strong>
            {"Based on recorded health factors"}
          </div>
          <div className={"snapshot"}>
            <strong>{"Assessment status"}</strong>
            {esc(r.saved ? "Saved" : "Ready to save")}
          </div>
        </div>
        <div className={"actions"}>
          {r.saved
            ? tag("Saved assessment")
            : b("Save assessment", "saveAssessment", "primary")}
          {b("Assessment History", "nav:Assessment History")}
          {b("Print", "print")}
        </div>
      </div>
    </>
  );
}
