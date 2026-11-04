import { FocusedAssessment27 } from "../components/FocusedAssessment27";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { PreAssessmentCheck } from "../components/PreAssessmentCheck";
import { b, head, patientIdent, requiredLabel } from "../components/shared";
import {
  FEATURE_NAMES27,
  QUESTIONS27,
  INTAKE27_SCHEMA,
  derive27,
  isApplicable27,
  assessment27Steps,
  sanitizeNumericInput,
  IPAQ_DAYS,
} from "../services/assessment27";
import { screeningForPatient } from "../services/preAssessment";
import { createIntake27, intakes27 } from "../state/intakes27";
import { P, patients, S, render, msg, log } from "../state/store";
import { openPintigConfirm } from "../state/actions";
import { age } from "../utils/format";
import { numericError } from "../utils/numericValidation";
import { questionnaireOptionLabel } from "../utils/questionnaireOptionLabel";
import { educationCategory } from "../services/featureProtocolV1";
import { INCOME_OPTIONS } from "../services/sesProtocol";
import { illustrativeQuestionnaire, measurementBmi } from "../services/illustrativeQuestionnaire";
import "../styles/assessment27.css";

export function Assessment27Page() {
  const [stepIndex, setStepIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [dietIndex, setDietIndex] = useState(0);
  const [navigation, setNavigation] = useState(0);
  const [researchEstimate, setResearchEstimate] = useState<number | null>(null);
  const [researchEstimateError, setResearchEstimateError] = useState<string | null>(null);
  const [researchEstimatePending, setResearchEstimatePending] = useState(false);
  const [illustrativeError, setIllustrativeError] = useState<string | null>(null);
  const destinationHeading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (!navigation) return;
    const heading = destinationHeading.current;
    if (!heading) return;
    const header = document.querySelector<HTMLElement>(".topbar");
    heading.style.scrollMarginTop = `${(header?.getBoundingClientRect().height ?? 0) + 16}px`;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start", behavior: "instant" });
  }, [navigation]);
  const announceNavigation = () => setNavigation(value => value + 1);
  const p = P(S.patientId);
  const answers = S.draft?.schema === INTAKE27_SCHEMA ? S.draft : {};
  const unlocked = !!p && !!screeningForPatient(S.preAssessment, p);
  const result = p ? derive27(answers, p) : null;
  const sections = [...new Set(QUESTIONS27.map((q) => q.section))];
  const steps = assessment27Steps(sections);
  const finalStep = stepIndex === steps.length;
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const updateMany = (values: Record<string, string>) => {
    setIllustrativeError(null);
    S.draft = {
      ...answers,
      schema: INTAKE27_SCHEMA,
      pid: String(S.patientId ?? ""),
      ...values,
    };
    S.result = null;
    setResearchEstimate(null);
    setResearchEstimateError(null);
    render();
  };
  const update = (id: string, value: string) => updateMany({ [id]: value });
  const isActivityStep = !finalStep && currentStep.title === "Physical activity and sitting";
  const isDietStep = !finalStep && currentStep.title === "Diet";
  const dietQuestions = QUESTIONS27.filter(q => q.section === "Dietary questionnaire");
  const dietPageSize = 8;
  const dietPages = Math.ceil(dietQuestions.length / dietPageSize);
  const visibleSections = isActivityStep ? [currentStep.sections[activityIndex]] : currentStep.sections;
  const changePatient = (value: string) => {
    const change = () => {
      setIllustrativeError(null);
      setResearchEstimate(null);
      setResearchEstimateError(null);
      setStepIndex(0);
      setActivityIndex(0);
      setDietIndex(0);
      S.patientId = P(value)?.id ?? null;
      S.preAssessment = null;
      const saved = [...intakes27]
        .reverse()
        .find((record) => record.patientId === S.patientId);
      S.draft = saved
        ? { ...saved.rawResponses, schema: INTAKE27_SCHEMA, pid: value }
        : { schema: INTAKE27_SCHEMA, pid: value };
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
  const saveResponses = () => {
    if (!finalStep) return;
    S.assessmentSavedNotice = 0;
    if (!p) {
      msg("Choose a patient before saving.", true);
      render();
      return;
    }
    try {
      const record = createIntake27(S.user, p, S.preAssessment, answers);
      intakes27.push({ ...record, id: intakes27.length + 1 });
      S.assessmentSavedNotice = Date.now();
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
        if (page >= 0) {
          setStepIndex(page);
          if (firstQuestion.section === "Dietary questionnaire") setDietIndex(Math.floor(dietQuestions.indexOf(firstQuestion) / dietPageSize));
          if (steps[page].title === "Physical activity and sitting") setActivityIndex(steps[page].sections.indexOf(firstQuestion.section));
        }
      }
      render();
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
    }
  };
  const calculateIllustrative = () => {
    if (!p || !finalStep) return;
    try {
      if (!S.user?.active || !['admin', 'worker'].includes(S.user.role)) throw new Error('Sign in with an authorized account.');
      const output = illustrativeQuestionnaire(answers, p, S.preAssessment);
      const questionnaire = createIntake27(S.user, p, S.preAssessment, answers);
      intakes27.push({ ...questionnaire, id: intakes27.length + 1 });
      S.result = output;
      S.assessmentSavedNotice = 0;
      S.message = '';
      log('Calculated an illustrative cardiovascular risk estimate for ' + p.record);
      render();
      requestAnimationFrame(() => {
        document.querySelector('.appmain')?.scrollTo({ top: 0, behavior: 'instant' });
        window.scrollTo({ top: 0, behavior: 'instant' });
        const heading = document.querySelector<HTMLElement>('.maincontent h1');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
      });
    } catch (error) { setIllustrativeError((error as Error).message); }
  };
  const calculateResearchEstimate = async () => {
    if (!result) return;
    setResearchEstimate(null);
    setResearchEstimateError(null);
    if (result.issues.length || result.incomplete.length) {
      setResearchEstimateError("Correct the listed entries and complete all applicable questions before calculating the research estimate.");
      return;
    }
    const education = educationCategory(answers);
    const incomeBand = INCOME_OPTIONS.indexOf(answers.familyIncomePH as typeof INCOME_OPTIONS[number]);
    const supportedPeople = Number(answers.incomeSupportedPeople);
    const features = { ...result.features };
    delete features.ses_index_0_100;
    if (education === null || incomeBand < 0 || incomeBand > 5 || !Number.isInteger(supportedPeople) || supportedPeople < 1 || Object.values(features).some(value => value === null)) {
      setResearchEstimateError("The questionnaire does not yet provide every input required by the experimental research model.");
      return;
    }
    setResearchEstimatePending(true);
    try {
      const response = await fetch("/experimental-proxy-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Pintig-Research": "questionnaire-proxy-local-only" },
        body: JSON.stringify({ features: { ...features, ses_index_0_100: 0 }, ses: { education_category: education, income_band: incomeBand, income_supported_people: supportedPeople } }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !body || typeof body !== "object" || typeof (body as { risk10?: unknown }).risk10 !== "number") throw new Error("The local research model is unavailable.");
      setResearchEstimate((body as { risk10: number }).risk10);
    } catch {
      setResearchEstimateError("The local research model is unavailable. Start the research model service, then try again.");
    } finally { setResearchEstimatePending(false); }
  };
  return (
    <>
      {head(
        "New Risk Assessment",
        "Record measurements and original questionnaire responses.",
        b("← Dashboard", "nav:Dashboard"),
      )}
      <section className="panel assessment27">
        <form id="assessment27Form" noValidate onSubmit={e => e.preventDefault()}>
          <h2>Patient identification</h2>
          <div className="field">
              <label htmlFor="pid">{requiredLabel("Patient profile", true)}</label>
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
            <strong>Illustrative assessment</strong>
            <p>
              The assessment uses the illustrative calculation and supported questionnaire inputs. It is not a validated clinical prediction.
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
              <h2 ref={finalStep ? destinationHeading : undefined} tabIndex={finalStep ? -1 : undefined}>{finalStep ? "Review and save" : currentStep.title}</h2>
              <p>
                Move between steps at any time. Unanswered items can be saved as
                missing; invalid numeric entries must be corrected.
              </p>
            </div>
            {isActivityStep && (
              <nav className="activity-navigation" aria-label="Physical activity sections">
                <p>Activity section {activityIndex + 1} of {currentStep.sections.length}</p>
                <div>{["Work", "Travel", "Home", "Leisure", "Sitting"].map((label, index) =>
                  <button key={label} type="button" className={index === activityIndex ? "active" : ""} aria-current={index === activityIndex ? "step" : undefined} onClick={() => { setActivityIndex(index); announceNavigation(); }}>{label}</button>
                )}</div>
              </nav>
            )}
            {isDietStep && <nav className="activity-navigation" aria-label="Dietary questionnaire pages">
              <p aria-live="polite">Food items {dietIndex * dietPageSize + 1}–{Math.min((dietIndex + 1) * dietPageSize, dietQuestions.length)} of {dietQuestions.length}</p>
              <div>{Array.from({ length: dietPages }, (_, index) => <button type="button" key={index} className={dietIndex === index ? "active" : ""} aria-current={dietIndex === index ? "page" : undefined} onClick={() => { setDietIndex(index); announceNavigation(); }}>Page {index + 1}</button>)}</div>
            </nav>}
            {!finalStep &&
              visibleSections.map((section) => (
                <section
                  className="intake27-section"
                  key={section}
                  aria-label={section}
                >
                  <div className="intake-section-head">
                    <h2 ref={section === visibleSections[0] ? destinationHeading : undefined} tabIndex={-1}>{section}{isDietStep && <span className="pintig-sr-only"> — Page {dietIndex + 1} of {dietPages}</span>}</h2>
                  </div>
                  {(section === "Alcohol consumption" || section === "Active smoking") ? (
                    <FocusedAssessment27 section={section} answers={answers} update={updateMany} features={result?.features ?? {}} issues={result?.issues ?? []} patientAge={p ? age(p.dob) : 0} />
                  ) : <>
                  {section === "Anthropometric and cardiovascular measurements" && <>
                    <div className="gridform">
                      {([['illustrativeHeight', 'Height', 'cm', 110, 220], ['illustrativeWeight', 'Weight', 'kg', 25, 250]] as const).map(([key, label, unit, min, max]) => {
                        const error = answers[key] ? numericError(answers[key], { min, max, step: 'any' }) : '';
                        return <div className="field" key={key}>
                          <label htmlFor={key}>{requiredLabel(`${label} (${unit})`, true)}</label>
                          <input id={key} type="text" inputMode="decimal" aria-required="true" aria-invalid={!!error} aria-describedby={`${key}-help`} value={answers[key] ?? ''}
                            onChange={e => { const value = sanitizeNumericInput(e.target.value); if (value !== null) update(key, value); }} />
                          <small id={`${key}-help`}>{error || `Record measured ${label.toLowerCase()} in ${unit}.`}</small>
                        </div>;
                      })}
                    </div>
                    <p aria-live="polite">Calculated BMI: <strong>{measurementBmi(answers) == null ? 'Unavailable — enter valid height and weight' : `${measurementBmi(answers)} kg/m²`}</strong></p>
                  </>}
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
                        q.section === section && isApplicable27(q, answers) && (section !== "Dietary questionnaire" || dietQuestions.slice(dietIndex * dietPageSize, (dietIndex + 1) * dietPageSize).includes(q)),
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
                        <div className={q.id.endsWith("Clothing") ? "field measurement-metadata" : "field"}>
                          <label htmlFor={id}>
                            {q.sharedPrompt && <span className="pintig-sr-only">{q.sharedPrompt} </span>}
                            {q.context && <span className="question-context">{q.context} &mdash; </span>}
                            {requiredLabel(q.text, !q.optional)}
                            {q.optional && <span className="question-unit"> (optional)</span>}
                            {q.unit && (
                              <span className="question-unit"> ({q.unit})</span>
                            )}
                          </label>
                          {/^ipaq\d+$/.test(q.id) && IPAQ_DAYS.includes(Number(q.id.slice(4))) ? (
                            <select id={id} value={answers[q.id] ?? ""} aria-invalid={!!problem} aria-required={!q.optional || undefined} aria-describedby={id + "-source"} onChange={e => update(q.id, e.target.value)}>
                              <option value="">Select days</option>
                              {Array.from({ length: 8 }, (_, days) => <option key={days} value={days}>{days === 0 ? "0 days (none)" : days + (days === 1 ? " day" : " days")}</option>)}
                            </select>
                          ) : q.options ? (
                            <select
                              id={id}
                              name={q.id}
                              value={answers[q.id] ?? ""}
                              onChange={(e) => update(q.id, e.target.value)}
                              aria-invalid={!!problem}
                              aria-required={!q.optional || undefined}
                              aria-describedby={id + "-source"}
                            >
                              <option value="">Choose an answer</option>
                              {q.options.map((o) => (
                                <option key={o} value={o}>
                                  {questionnaireOptionLabel(o)}
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
                              aria-required={!q.optional || undefined}
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
                              aria-required={!q.optional || undefined}
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
                    }).flatMap((field, index, fields) => {
                      const key = String(field.key);
                      if (key === "gen3Education") return [<div className="education-row gridform" key={key + "-row"}>{field}</div>];
                      if (key === "familyIncomePH") return [<div className="household-income-row gridform" key={key + "-row"}>{field}{fields.find(item => String(item.key) === "incomeSupportedPeople")}</div>];
                      if (key === "incomeSupportedPeople") return [];
                      const activityNames: Record<number, string> = {
                        2: "Vigorous activity at work", 4: "Moderate activity at work", 6: "Walking at work",
                        10: "Cycling for transportation", 12: "Walking for transportation",
                        14: "Vigorous activity in the garden or yard", 16: "Moderate activity in the garden or yard", 18: "Moderate activity inside the home",
                        20: "Walking for recreation", 22: "Vigorous recreation", 24: "Moderate recreation",
                      };
                      const activityNumber = /^ipaq\d+$/.test(key) ? Number(key.slice(4)) : 0;
                      if (activityNames[activityNumber]) {
                        const timeFields = fields.filter(item => ["ipaq" + (activityNumber + 1) + "_hours", "ipaq" + (activityNumber + 1) + "_minutes"].includes(String(item.key)));
                        return [<fieldset className="activity-card" key={key + "-activity"}>
                          <legend>{activityNames[activityNumber]}</legend>
                          <div className="gridform">{field}{timeFields}</div>
                        </fieldset>];
                      }
                      const durationMatch = /^ipaq(\d+)_(hours|minutes)$/.exec(key);
                      if (durationMatch && activityNames[Number(durationMatch[1]) - 1]) return [];
                      if (["waist1", "hip1"].includes(key)) {
                        const measurement = key === "waist1" ? "Waist" : "Hip";
                        return [
                          <fieldset className="circumference-group" key={key + "-group"}>
                            <legend>{measurement} measurements</legend>
                            <div className="gridform circumference-fields">
                              {fields.slice(index, index + 3)}
                            </div>
                          </fieldset>,
                        ];
                      }
                      if (["waist2", "waistClothing", "hip2", "hipClothing"].includes(key)) return [];
                      return [field];
                    })}
                  </div>
                  </>}
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
                        <small className="ses-availability">{result.protocol.ses.reason}</small>
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
                  complete AHEI score. SES awaits a validated reference-based scoring method; education and income responses are preserved. Activity
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
                className="review-card"
                aria-label="Response review"
              >
                <header className="review-card-header">
                  <h2>Response review</h2>
                  <p>Review the completion status and key notes before proceeding.</p>
                </header>
                <div className="review-card-columns">
                  <div>
                    <h3>Assessment summary</h3>
                    <div className="review-summary">
                      <p className="review-completion">{result.incomplete.length === 0 && result.issues.length === 0 && measurementBmi(answers) !== null ? 'All required applicable fields are complete' : 'Review incomplete or invalid responses before calculating'}</p>
                      <p>Applicable unanswered fields: <strong>{result.incomplete.length + ['illustrativeHeight', 'illustrativeWeight'].filter(key => !answers[key]?.trim()).length}</strong></p>
                      <p>Unanswered fields can be saved as missing values.</p>
                    </div>
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
                  </div>
                  <div className="review-notes">
                    <h3>Important notes</h3>
                    <p>Passive-smoking exposure periods may overlap and are not automatically combined.</p>
                    <p>Sleep duration is recorded as typical hours per day.</p>
                  </div>
                </div>
              </section>
            )}
            {!finalStep && <div className="actions assessment-pagination">
              <button
                type="button"
                className="btn"
                onClick={() => { if (isDietStep && dietIndex > 0) setDietIndex(dietIndex - 1); else if (isActivityStep && activityIndex > 0) setActivityIndex(activityIndex - 1); else { setStepIndex(Math.max(0, stepIndex - 1)); setActivityIndex(0); } announceNavigation(); }}
                disabled={stepIndex === 0}
              >
                Back
              </button>
              {!finalStep ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    announceNavigation();
                    if (isDietStep && dietIndex < dietPages - 1) setDietIndex(dietIndex + 1);
                    else if (isActivityStep && activityIndex < currentStep.sections.length - 1) setActivityIndex(activityIndex + 1);
                    else { setStepIndex(Math.min(steps.length, stepIndex + 1)); setActivityIndex(0); }
                  }}
                >
                  Continue
                </button>
              ) : (
                <button type="button" className="btn primary" onClick={saveResponses}>
                  Save Questionnaire Responses
                </button>
              )}
            </div>}
            {finalStep && <section className="review-card" aria-label="Illustrative assessment review">
              <header className="review-card-header">
                <h2>Assessment actions</h2>
                <p>Save your responses, calculate risk, or manage this assessment.</p>
              </header>
              <div className="review-actions-body">
              {illustrativeError && <p role="alert" className="field-error">{illustrativeError}</p>}
              <div className="review-action-row">
                <div className="review-action-group">
                  <button type="button" className="btn primary" onClick={calculateIllustrative}>Calculate Risk</button>
                  <button type="button" className="btn review-secondary" onClick={saveResponses}>Save Questionnaire Responses</button>
                </div>
                <div className="review-action-group">
                  <button type="button" className="btn" onClick={() => { setStepIndex(Math.max(0, stepIndex - 1)); setActivityIndex(0); announceNavigation(); }}>Back</button>
                  {b("Clear Assessment", "resetAssessment")}
                </div>
              </div>
            <details className="review-research">
            <summary>Optional research estimate</summary>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={calculateResearchEstimate}
                disabled={researchEstimatePending || !finalStep}
                title="Available only after questionnaire review; this is a research-only proxy estimate."
              >
                {researchEstimatePending ? "Calculating…" : "Calculate research estimate"}
              </button>
            </div>
            {finalStep && (
              <div className="model-availability research-estimate" role="status" aria-live="polite">
                <strong>Research-only model output</strong>
                {researchEstimate === null ? (
                  <p>This optional calculation uses the local questionnaire-aligned competing-risk RSF experiment. It does not provide a clinical risk category or diagnosis.</p>
                ) : (
                  <p>Estimated 10-year recorded-CVD proxy probability: <strong>{(researchEstimate * 100).toFixed(1)}%</strong>. This is an experimental proxy estimate, not the intended major-CVD risk outcome.</p>
                )}
                {researchEstimateError && <p className="field-error">{researchEstimateError}</p>}
              </div>
            )}
            </details>
              </div>
            </section>}
            {!finalStep && <div className="actions">{b("Clear Assessment", "resetAssessment")}</div>}
          </fieldset>
        </form>
      </section>
    </>
  );
}
