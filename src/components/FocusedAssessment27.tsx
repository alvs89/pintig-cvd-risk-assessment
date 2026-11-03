import { BEVERAGES, QUESTIONS27, isApplicable27, sanitizeNumericInput, type Answers27 } from "../services/assessment27";
import { numericError } from "../utils/numericValidation";

type Props = {
  section: "Alcohol consumption" | "Active smoking";
  answers: Answers27;
  update: (values: Answers27) => void;
  features: Record<string, number | string | null>;
  issues: string[];
  patientAge: number;
};

export function FocusedAssessment27({ section, answers, update, features, issues, patientAge }: Props) {
  const sourceQuestions = QUESTIONS27.filter(q => q.section === section);
  const field = (id: string) => {
    const q = sourceQuestions.find(item => item.id === id)!;
    if (!q || !isApplicable27(q, answers)) return null;
    const problem = issues.find(issue => issue.startsWith(id + ":"));
    const inputId = "q27-" + id;
    const error = !q.options && answers[id] ? numericError(answers[id], { min: q.min, max: q.max, step: q.integer ? 1 : "any" }) : "";
    const options = q.options;
    const label = <>{q.text}{q.unit && <span className="question-unit"> ({q.unit})</span>}</>;
    const choiceLabel = (option: string) => option.replace(/^\d+ = /, "");
    return <div className="focused-field" key={id}>
      {options && id !== "alcoholHistory" && id.endsWith("_frequency") ? <>
        <label htmlFor={inputId}>{label}</label>
        <select id={inputId} value={answers[id] ?? ""} onChange={e => update({ [id]: e.target.value })} aria-describedby={inputId + "-help"}>
          <option value="">Choose frequency</option>{options.map(o => <option key={o}>{o}</option>)}
        </select>
      </> : options ? <fieldset className="response-choices" id={inputId} aria-describedby={inputId + "-help"}>
        <legend>{label}</legend>
        <div className={id === "alcoholHistory" ? "choice-list" : "choice-row"}>
          {options.map(o => <label key={o}><input type="radio" name={id} value={o} checked={answers[id] === o} onChange={() => update({ [id]: o })} />{choiceLabel(o)}</label>)}
        </div>
        {!!answers[id] && <button className="clear-response" type="button" onClick={() => update({ [id]: "" })}>Clear answer</button>}
      </fieldset> : <>
        <label htmlFor={inputId}>{label}</label>
        <input id={inputId} type="text" inputMode={q.integer ? "numeric" : "decimal"} value={answers[id] ?? ""}
          aria-invalid={!!problem || !!error} aria-describedby={inputId + "-help"}
          onChange={e => {
            const value = sanitizeNumericInput(e.target.value, q.integer);
            if (value !== null) update({ [id]: value });
            else { e.currentTarget.value = answers[id] ?? ""; e.currentTarget.setCustomValidity("Enter numbers only."); e.currentTarget.reportValidity(); e.currentTarget.setCustomValidity(""); }
          }} />
      </>}
      <div id={inputId + "-help"}>
        {q.note && <small>{q.note}</small>}
        {(problem || error) && <small role="alert" className="field-error">{error || problem?.split(":").slice(1).join(":")}</small>}
      </div>
    </div>;
  };
  const alcohol = section === "Alcohol consumption";
  const formerDrinker = answers.alcoholHistory === "Formerly used alcohol products";
  const showBeverages = ["Currently use alcohol products", "Formerly used alcohol products"].includes(answers.alcoholHistory);
  const summaries = alcohol
    ? [["Current weekly ethanol consumption", "alcohol_ethanol_g_week", "g/week"], ["Heavy episodic drinking", "heavy_episodic_alcohol", ""]]
    : [["Smoking status", "smoking_status", ""], ["Current smoking intensity", "current_smoking_intensity_cigs_day", "cigarettes/day"], ["Cumulative smoking exposure", "smoking_pack_years", "pack-years"]];
  const hasIssues = sourceQuestions.some(q => issues.some(issue => issue.startsWith(q.id + ":")));
  return <div className="focused-assessment">
    {alcohol ? <>
      {field("alcoholHistory")}
      {showBeverages && <fieldset className="beverage-selection">
        <legend>{sourceQuestions.find(q => q.id === "alc_beer")!.sharedPrompt}</legend>
        {formerDrinker && <p>Past drinking history: enter the beverages and usual amounts consumed when you drank.</p>}
        <p>Select all that apply. Unchecked types are recorded as not selected after you make a selection.</p>
        <div className="choice-row">
          {BEVERAGES.map(([id, label]) => <label key={id}><input id={"q27-alc_" + id} type="checkbox" checked={answers["alc_" + id] === "Selected"}
            onChange={e => update(Object.fromEntries(BEVERAGES.map(([key]) => ["alc_" + key, key === id ? e.target.checked ? "Selected" : "Not selected" : answers["alc_" + key] || "Not selected"])))} />{label}</label>)}
        </div>
        <button type="button" className="clear-response" onClick={() => update(Object.fromEntries(BEVERAGES.map(([id]) => ["alc_" + id, ""])))}>Clear beverage answers</button>
        {BEVERAGES.filter(([id]) => answers["alc_" + id] === "Selected").map(([id, label, ml]) => <fieldset className="beverage-card" key={id}>
          <legend>{label}</legend><p className="serving-reference">Reference serving: {ml} mL</p>
          <div className="focused-columns">{field("alc_" + id + "_frequency")}{field("alc_" + id + "_quantity")}</div>
          <small>Enter the average number of drinks for the selected daily, weekly or monthly period.</small>
        </fieldset>)}
      </fieldset>}
      {showBeverages && <p>For the following question, answer about your current drinking, not past drinking.</p>}
      {field("heavyAlcohol")}
    </> : <>
      {field("smokeEver")}
      {field("smokeCurrent")}
      {field("smokeLastYear")}
      <div className="focused-columns">{field("smokeNow")}{field("smokeAverage")}</div>
      <div className="focused-columns">{field("smokeStart")}{isApplicable27(sourceQuestions.find(q => q.id === "smokeStart")!, answers) && <div className="profile-age"><span>Age at assessment</span><strong>{patientAge} years</strong><small>From the patient profile</small></div>}</div>
      {field("smokeStop")}{field("smokeBreak")}{field("smokeBreakYears")}
    </>}
    <section className="focused-summary" aria-label={section + " calculated values"}>
      <h3>Calculated assessment values</h3>
      {alcohol && formerDrinker && <p>You no longer drink alcohol, so current weekly consumption is 0 g/week. Beverage details are retained as past drinking history.</p>}
      <dl>{summaries.map(([label, key, unit]) => <div key={key}><dt>{label}</dt><dd>{hasIssues ? "Check responses" : features[key] == null ? "Unavailable" : key === "heavy_episodic_alcohol" ? features[key] === 1 ? "Yes" : "No" : typeof features[key] === "number" ? Number((features[key] as number).toFixed(2)) : features[key]}{!hasIssues && features[key] != null && unit ? " " + unit : ""}</dd></div>)}</dl>
      {alcohol && <small>Ethanol estimates use reference serving sizes and assumed alcohol strengths. They are not a risk estimate.</small>}
    </section>
    <details className="questionnaire-sources"><summary>Questionnaire references</summary><ul>{sourceQuestions.filter(q => isApplicable27(q, answers)).map(q => <li key={q.id}>{q.text}: {q.source}</li>)}</ul></details>
  </div>;
}
