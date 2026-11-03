import { Fragment, useEffect, useState, type FormEvent } from "react";
import { PreAssessmentCheck } from "../components/PreAssessmentCheck";
import { b, head, patientIdent } from "../components/shared";
import {
  FEATURE_NAMES27,
  QUESTIONS27,
  INTAKE27_SCHEMA,
  derive27,
  isApplicable27,
  assessment27Steps,
  sanitizeNumericInput,
} from "../services/assessment27";
import { screeningForPatient } from "../services/preAssessment";
import { createIntake27, intakes27 } from "../state/intakes27";
import { P, patients, S, render, msg, log } from "../state/store";
import { openPintigConfirm } from "../state/actions";
import { age } from "../utils/format";
import { numericError } from "../utils/numericValidation";
import "../styles/assessment27.css";

export function Assessment27Page() {
  const [stepIndex, setStepIndex] = useState(0);
  const [saveNotice, setSaveNotice] = useState(0);
  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(0), 6000);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);
  const p = P(S.patientId);
  const answers = S.draft?.schema === INTAKE27_SCHEMA ? S.draft : {};
  const unlocked = !!p && !!screeningForPatient(S.preAssessment, p);
  const result = p ? derive27(answers, p) : null;
  const dayKeys = ["sleep", "sleepSedentary", "sleepSlight", "sleepModerate", "sleepHeavy"];
  const dayEntered = dayKeys.filter((key) => answers[key]?.trim() && Number.isFinite(Number(answers[key])));
  const dayTotal = dayEntered.reduce((sum, key) => sum + Number(answers[key]), 0);
  const dayIssue = result?.issues.find((issue) => issue.startsWith("typicalDay:"));
  const sections = [...new Set(QUESTIONS27.map((q) => q.section))];
  const steps = assessment27Steps(sections);
  const finalStep = stepIndex === steps.length;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const update = (id: string, value: string) => {
    S.draft = {
      ...answers,
      schema: INTAKE27_SCHEMA,
      pid: String(S.patientId ?? ""),
      [id]: value,
    };
    S.result = null;
    render();
  };
  const changePatient = (value: string) => {
    const change = () => {
      setStepIndex(0);
      S.patientId = P(value)?.id ?? null;
      S.preAssessment = null;
      S.draft = { schema: INTAKE27_SCHEMA, pid: value };
      S.result = null;
      render();
    };
    if (Object.keys(answers).some((k) => !["schema", "pid"].includes(k)))
      openPintigConfirm({
        title: "Change assessment patient?",
        description:
          "This clears unsaved questionnaire answers. Saved responses remain available in Assessment History.",
        actionLabel: "Change patient",
        onConfirm: change,
      });
    else change();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaveNotice(0);
    if (!p) {
      msg("Choose a patient before saving.", true);
      render();
      return;
    }
    try {
      const record = createIntake27(S.user, p, S.preAssessment, answers);
      intakes27.push({ ...record, id: intakes27.length + 1 });
      setSaveNotice(Date.now());
      S.result = null;
      log("Saved questionnaire responses for " + p.record);
      msg(
        "Questionnaire responses saved for this session. No risk estimate was calculated.",
      );
      render();
    } catch (error) {
      msg((error as Error).message, true);
      const firstIssue = result?.issues[0];
      const firstQuestion = QUESTIONS27.find((q) =>
        firstIssue?.startsWith(q.id + ":"),
      );
      if (firstQuestion) {
        const page = steps.findIndex((step) =>
          step.sections.includes(firstQuestion.section),
        );
        if (page >= 0) setStepIndex(page);
      }
      if (firstIssue?.startsWith("typicalDay:")) {
        setStepIndex(steps.findIndex((step) => step.sections.includes("Sleep and typical-day activity")));
      }
      render();
      requestAnimationFrame(() =>
        (firstIssue?.startsWith("typicalDay:")
          ? document.getElementById("typical-day-total")
          : document.querySelector<HTMLElement>('[aria-invalid="true"]'))?.focus(),
      );
    }
  };
  return (
    <>
      <div className="assessment-save-toast" role="status" aria-live="polite" aria-atomic="true">
        {!!saveNotice && (
          <>
            <span>Questionnaire responses saved. View them in Assessment History.</span>
            <button type="button" aria-label="Dismiss save notification" onClick={() => setSaveNotice(0)}>×</button>
          </>
        )}
      </div>
      {head(
        "New Risk Assessment",
        "Record measurements and original questionnaire responses.",
        b("← Dashboard", "nav:Dashboard"),
      )}
      <section className="panel assessment27">
        <form id="assessment27Form" noValidate onSubmit={submit}>
          <h2>Patient identification</h2>
          <div className="field">
            <label htmlFor="pid">Patient profile *</label>
            <select
              id="pid"
              value={p?.id ?? ""}
              onChange={(e) => changePatient(e.target.value)}
              aria-required="true"
            >
              <option value="">Choose patient</option>
              {patients.map((z) => (
                <option value={z.id} key={z.id}>
                  {z.record}
                </option>
              ))}
            </select>
          </div>
          <div className="identity-context">{patientIdent(p ?? null)}</div>
          {p && (
            <p>
              Age at assessment: {age(p.dob)} years · Recorded sex: {p.sex}
            </p>
          )}
          <PreAssessmentCheck />
          <div className="model-availability" role="status">
            <strong>Risk calculation unavailable</strong>
            <p>
              This questionnaire is not supported by a validated risk model. You
              can save the responses without generating a risk estimate.
            </p>
          </div>
          <fieldset
            className="assessment-predictors"
            hidden={!unlocked}
            disabled={!unlocked}
          >
            <legend className="pintig-sr-only">Questionnaire responses</legend>
            <p>
              Use the original response choices below. Leave an unavailable
              measurement blank. Saving preserves incomplete responses; it does
              not turn missing answers into “No”.
            </p>
            <div
              className="assessment-stepper"
              aria-label="Questionnaire progress"
            >
              <div className="assessment-stepper-top">
                <span>
                  Step {Math.min(stepIndex + 1, steps.length + 1)} of{" "}
                  {steps.length + 1}
                </span>
                <span>
                  {Math.round(
                    (Math.min(stepIndex + 1, steps.length + 1) /
                      (steps.length + 1)) *
                      100,
                  )}
                  % complete
                </span>
              </div>
              <progress
                value={Math.min(stepIndex + 1, steps.length + 1)}
                max={steps.length + 1}
                aria-label="Questionnaire progress"
              />
              <h2>{finalStep ? "Review and save" : currentStep.title}</h2>
              <p>
                Move between steps at any time. Unanswered items can be saved as
                missing; invalid numeric entries must be corrected.
              </p>
            </div>
            {!finalStep &&
              currentStep.sections.map((section) => (
                <section
                  className="intake27-section"
                  key={section}
                  aria-label={section}
                >
                  <div className="intake-section-head">
                    <h2>{section}</h2>
                  </div>
                  {section === "Sleep and typical-day activity" && (
                    <div id="typical-day-total" tabIndex={-1} role="status" aria-live="polite" className={dayIssue ? "notice field-error" : "notice"}>
                      <strong>Combined daily total: {Number(dayTotal.toFixed(2))} / 24 hours</strong>
                      <p>{dayIssue
                        ? "The five activities must add up to 24 hours. Review all five entries without counting the same time twice."
                        : dayEntered.length < 5
                          ? `${dayEntered.length} of 5 activities entered. Complete the remaining entries to check the total.`
                          : "The five activities total 24 hours."}</p>
                    </div>
                  )}
                  {section ===
                    "Anthropometric and cardiovascular measurements" && (
                    <p>
                      The source form refers to a separate measurement manual.
                      Use your approved clinical measurement procedure; the
                      supplied form does not establish all positioning and
                      preparation details.
                    </p>
                  )}
                  {section === "Physical activity — work" && (
                    <div>
                      <p>
                        We are interested in finding out about the kinds of
                        physical activities that people do as part of their
                        everyday lives. The questions will ask you about the
                        time you spent being physically active in the last 7
                        days. Please answer each question even if you do not
                        consider yourself to be an active person. Please think
                        about the activities you do at work, as part of your
                        house and yard work, to get from place to place, and in
                        your spare time for recreation, exercise or sport.
                      </p>
                      <p>
                        Think about all the vigorous and moderate activities
                        that you did in the last 7 days. Vigorous physical
                        activities refer to activities that take hard physical
                        effort and make you breathe much harder than normal.
                        Moderate activities refer to activities that take
                        moderate physical effort and make you breathe somewhat
                        harder than normal.
                      </p>
                      <p>
                        The first section is about your work. This includes paid
                        jobs, farming, volunteer work, course work, and any
                        other unpaid work that you did outside your home. Do not
                        include unpaid work you might do around your home, like
                        housework, yard work, general maintenance, and caring
                        for your family. These are asked in Part 3.
                      </p>
                      {p && age(p.dob) === 70 && (
                        <p role="note">
                          This questionnaire specifies ages 15–69.
                          Interpretation at age 70 requires review.
                        </p>
                      )}
                    </div>
                  )}
                  {section === "Physical activity — transportation" && (
                    <p>
                      These questions are about how you traveled from place to
                      place, including to places like work, stores, movies, and
                      so on.
                    </p>
                  )}
                  {section === "Physical activity — home" && (
                    <p>
                      This section is about some of the physical activities you
                      might have done in the last 7 days in and around your
                      home, like housework, gardening, yard work, general
                      maintenance work, and caring for your family.
                    </p>
                  )}
                  {section === "Physical activity — recreation" && (
                    <p>
                      This section is about all the physical activities that you
                      did in the last 7 days solely for recreation, sport,
                      exercise or leisure. Please do not include any activities
                      you have already mentioned.
                    </p>
                  )}
                  {section === "Sedentary time" && (
                    <p>
                      The last questions are about the time you spend sitting
                      while at work, at home, while doing course work and during
                      leisure time. This may include time spent sitting at a
                      desk, visiting friends, reading or sitting or lying down
                      to watch television. Do not include any time spent sitting
                      in a motor vehicle that you have already told me about.
                    </p>
                  )}
                  <div className="gridform">
                    {QUESTIONS27.filter(
                      (q) =>
                        q.section === section && isApplicable27(q, answers),
                    ).map((q, index, visible) => {
                      const id = "q27-" + q.id;
                      const problem = result?.issues.find((issue) =>
                        issue.startsWith(q.id + ":"),
                      );
                      const numericProblem =
                        !q.options && q.inputType !== "text" && answers[q.id]
                          ? numericError(answers[q.id], {
                              min: q.min,
                              max: q.max,
                              step: q.integer ? 1 : "any",
                            })
                          : "";
                      return (
                        <Fragment key={q.id}>
                          {q.sharedPrompt && !visible.slice(0, index).some((previous) => previous.sharedPrompt === q.sharedPrompt) && (
                            <p className="source-question-stem">{q.sharedPrompt}</p>
                          )}
                          {q.id === "ipaq2" && (
                            <p className="question-instruction">
                              The next questions are about all the physical
                              activity you did in the last 7 days as part of
                              your paid or unpaid work. This does not include
                              traveling to and from work.
                            </p>
                          )}
                          {q.id === "ipaq10" && (
                            <p className="question-instruction">
                              Now think only about the bicycling and walking you
                              might have done to travel to and from work, to do
                              errands, or to go from place to place.
                            </p>
                          )}
                        <div className="field">
                          <label htmlFor={id}>
                            {q.sharedPrompt && <span className="pintig-sr-only">{q.sharedPrompt} </span>}
                            {q.context && <span className="question-context">{q.context} &mdash; </span>}
                            {q.text}
                            {q.unit && (
                              <span className="question-unit"> ({q.unit})</span>
                            )}
                          </label>
                          {q.options ? (
                            <select
                              id={id}
                              name={q.id}
                              value={answers[q.id] ?? ""}
                              onChange={(e) => update(q.id, e.target.value)}
                              aria-invalid={!!problem}
                              aria-describedby={id + "-source"}
                            >
                              <option value="">Choose an answer</option>
                              {q.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : q.inputType === "text" ? (
                            <input
                              id={id}
                              name={q.id}
                              type="text"
                              value={answers[q.id] ?? ""}
                              onChange={(e) => update(q.id, e.target.value)}
                              aria-invalid={!!problem}
                              aria-describedby={id + "-source"}
                            />
                          ) : (
                            <input
                              id={id}
                              name={q.id}
                              type="text"
                              inputMode={q.integer ? "numeric" : "decimal"}
                              pattern={
                                q.integer ? "[0-9]*" : "[0-9]*\\.?[0-9]*"
                              }
                              min={q.min}
                              max={q.max}
                              value={answers[q.id] ?? ""}
                              onChange={(e) => {
                                const cleaned = sanitizeNumericInput(
                                  e.target.value,
                                  q.integer,
                                );
                                if (cleaned === null) {
                                  const input = e.currentTarget;
                                  input.setCustomValidity(
                                    "Enter numbers only; use a decimal point when needed.",
                                  );
                                  input.reportValidity();
                                  input.value = answers[q.id] ?? "";
                                  input.setCustomValidity("");
                                  return;
                                }
                                update(q.id, cleaned);
                              }}
                              aria-invalid={!!problem || !!numericProblem}
                              aria-describedby={`${id}-source ${id}-error`}
                            />
                          )}
                          <div className="question-help">
                          {q.note && <small>{q.note}</small>}
                          <small id={id + "-source"} className="muted">
                            {q.source}
                          </small>
                          {(problem || numericProblem) && (
                            <small
                              id={id + "-error"}
                              className="field-error"
                              role="alert"
                            >
                              {numericProblem ||
                                problem?.slice(problem.indexOf(":") + 1)}
                            </small>
                          )}
                          </div>
                        </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </section>
              ))}
            {finalStep && (
              <section
                className="intake27-section"
                aria-label="Feature calculation review"
              >
                <h2>Calculated feature review</h2>
                <p>
                  Values are retained with their source responses. A missing
                  value means the required source response or provenance is
                  incomplete. Values come from the recorded profile, answers, or
                  documented calculations; no experimental dataset values are
                  populated here.
                </p>
                {result?.protocol && (
                  <dl className="intake27-derived">
                    <div>
                      <dt>Education and income SES index</dt>
                      <dd>
                        {result.protocol.features.ses_index_0_100 ??
                          "Unavailable"}{" "}
                        / 100
                      </dd>
                    </div>
                    <div>
                      <dt>Diet quality score</dt>
                      <dd>
                        {result.protocol.features.diet_score_0_100?.toFixed(
                          1,
                        ) ?? "Unavailable"}{" "}
                        / 100{" "}
                        {result.protocol.diet.missing.length > 0 &&
                          `(${result.protocol.diet.missing.length} food responses missing)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Physical activity</dt>
                      <dd>
                        {result.protocol.features.activity_min_week == null
                          ? (result.protocol.activity.reason ??
                            "Incomplete source responses")
                          : `${result.protocol.features.activity_min_week.toFixed(1)} minutes/week; ${result.protocol.activity.metMinutes?.toFixed(1)} MET-min/week`}
                      </dd>
                    </div>
                    <div>
                      <dt>Residence class</dt>
                      <dd>
                        {result.protocol.features.urban_rural_residence == null
                          ? "Unavailable: add classification and source"
                          : result.protocol.features.urban_rural_residence === 1
                            ? "Urban (0/1: 1)"
                            : "Rural (0/1: 0)"}
                      </dd>
                    </div>
                  </dl>
                )}
                <p>
                  Diet uses the documented PINTIG Food6 adaptation, not a
                  complete AHEI score. SES combines education and income with equal weights using an experimental method. Activity
                  reports IPAQ minutes and MET-minutes separately.
                </p>
                {result && (
                  <details className="intake27-section">
                    <summary>
                      View all 27 predictor values and their provenance
                    </summary>
                    <dl className="intake27-derived">
                      {FEATURE_NAMES27.map((name) => {
                        const info = result.featureProvenance[name];
                        const val = result.features[name];
                        return (
                          <div key={name}>
                            <dt>{name.replaceAll("_", " ")}</dt>
                            <dd>
                              {val == null ? "Unavailable" : String(val)} ·{" "}
                              {info.state === "assumption-derived"
                                ? "Calculated using stated assumptions"
                                : info.state === "derived"
                                  ? "Calculated from responses"
                                  : info.state === "observed"
                                    ? "Recorded measurement or profile"
                                    : "Unavailable"}
                              ; {info.method}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </details>
                )}
              </section>
            )}
            {finalStep && result && (
              <section
                className="intake27-section"
                aria-label="Response review"
              >
                <h2>Response review</h2>
                <p>
                  {result.incomplete.length} applicable fields unanswered. These
                  can be retained as missing in the saved record.
                </p>
                {result.issues.length > 0 && (
                  <div role="alert">
                    <p>Resolve these inconsistencies before saving:</p>
                    <ul>
                      {result.issues.map((issue) => (
                        <li key={issue}>
                          {issue.slice(issue.indexOf(":") + 1)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p>
                  Overlapping passive-smoking periods cannot be combined
                  reliably from the supplied questionnaire alone. Sleep is
                  recorded per typical day, not specifically per night.
                </p>
              </section>
            )}
            <div className="actions assessment-pagination">
              <button
                type="button"
                className="btn"
                onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
                disabled={stepIndex === 0}
              >
                Back
              </button>
              {!finalStep ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() =>
                    setStepIndex(Math.min(steps.length, stepIndex + 1))
                  }
                >
                  Continue
                </button>
              ) : (
                <button type="submit" className="btn primary">
                  Save questionnaire responses
                </button>
              )}
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn"
                disabled
                title="A compatible validated model is required"
              >
                Calculate risk
              </button>
              {b("Clear assessment", "resetAssessment")}
            </div>
          </fieldset>
        </form>
      </section>
    </>
  );
}
