import type { ReactNode } from "react";
import { NumericInput } from "./NumericInput";
import { ValidatedSelect } from "./ValidatedSelect";
import { Fragment } from "react";
import { htmlAttributes, withKeys } from "../components/markup";
import { generateGuidance } from "../services/guidance";
import { canReveal, isRevealed } from "../state/permissions";
import { P, S } from "../state/store";
import type { AssessmentRecord, Guidance, Patient } from "../types/domain";
import { dt, esc, pname } from "../utils/format";
import { phoneDigits } from "../utils/phone";
export const eyeOpen = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const eyeClosed = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18M10.5 5.2c.5-.1 1-.2 1.5-.2 6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.1 6.1C3.5 8 2 12 2 12s3.6 7 10 7c1.7 0 3.1-.5 4.5-1.2" />
    <path d="M9.8 9.8a3 3 0 0 0 4.4 4.4" />
  </svg>
);
export const b = (label: ReactNode, act: string, kind = "") => (
  <button type="button" className={"btn " + kind} data-act={act}>
    {label}
  </button>
);
export const tag = (text: string) => (
  <span
    className={
      "tag " +
      (text === "Very High"
        ? "veryhigh"
        : text === "High"
          ? "high"
          : text === "Low" || text === "Active"
            ? "low"
            : "")
    }
  >
    {text}
  </span>
);
export const requiredLabel = (
  label: string,
  required = /\*\s*$/.test(label),
) => (
  <>
    {label.replace(/\s*\*\s*$/, "")}
    {required && (
      <>
        {" "}
        <span className="required-marker" aria-hidden="true">
          *
        </span>
      </>
    )}
  </>
);
export const f = (
  label: string,
  key: string,
  value: unknown = "",
  type = "text",
  required = false,
  attrs = "",
) => (
  <div className="field">
    <label htmlFor={key}>{requiredLabel(label, required)}</label>
    {type === "number" ? (
      <NumericInput
        id={key}
        name={key}
        type="number"
        {...(S.page === "New Risk Assessment" && !S.result
          ? { value: String(value ?? ""), onChange: () => {} }
          : { defaultValue: String(value ?? "") })}
        required={required}
        {...htmlAttributes(attrs)}
      />
    ) : (
      <input
        id={key}
        name={key}
        type={type}
        {...(S.page === "New Risk Assessment" && !S.result
          ? { value: esc(value), onChange: () => {} }
          : { defaultValue: esc(value) })}
        required={required}
        {...htmlAttributes(attrs)}
      />
    )}
  </div>
);
export const sel = (
  label: string,
  key: string,
  options: (string | number | (string | number)[])[],
  value: unknown,
) => (
  <div className="field">
    <label htmlFor={key}>
      {requiredLabel(
        label,
        /\*\s*$/.test(label) || ["sex", "role"].includes(key),
      )}
    </label>
    <ValidatedSelect
      id={key}
      name={key}
      aria-required={
        /\*\s*$/.test(label) || ["sex", "role"].includes(key) || undefined
      }
      {...(["sex", "role"].includes(key)
        ? { defaultValue: String(value ?? "") }
        : { value: String(value ?? ""), onChange: () => {} })}
    >
      {options.map((option, index) => {
        const pair = Array.isArray(option) ? option : [option, option];
        return (
          <option key={index} value={String(pair[0])}>
            {pair[1]}
          </option>
        );
      })}
    </ValidatedSelect>
  </div>
);
export const head = (
  title: ReactNode,
  subtitle: ReactNode,
  extra: ReactNode = null,
) => (
  <div className="pagehead">
    <div>
      <div className="eyebrow">PINTIG / {S.page}</div>
      <h1>{title}</h1>
      <div className="muted tiny">{subtitle}</div>
    </div>
    {extra}
  </div>
);
export const metric = (label: string, number: ReactNode) => (
  <div className="metric">
    <div className="muted tiny">{label}</div>
    <div className="num">{number}</div>
  </div>
);
export function patientIdent(
  p: Partial<Patient> | null | undefined,
  showId = true,
) {
  if (!p)
    return (
      <>
        <span className={"identity-mask"}>{"Select a patient record"}</span>
      </>
    );
  let shown = isRevealed(p),
    key = esc(p.record);
  return (
    <>
      <span className={"patient-ident"}>
        {showId ? (
          <>
            <span className={"patient-code"}>{key}</span>
          </>
        ) : (
          ""
        )}
        <span className={shown ? "private-name" : "identity-mask"}>
          {shown ? esc(pname(p as Patient)) : "Name hidden"}
        </span>
        {canReveal(p) ? (
          <>
            <button
              type={"button"}
              className={"privacy-eye"}
              data-act={"revealIdentity:" + p.id}
              title={(shown ? "Hide" : "Reveal") + " patient name"}
              aria-label={(shown ? "Hide" : "Reveal") + " name for " + key}
              aria-pressed={shown}
            >
              {shown ? eyeClosed : eyeOpen}
            </button>
          </>
        ) : (
          ""
        )}
      </span>
    </>
  );
}

export function recordsTable(arr: AssessmentRecord[]) {
  return (
    <>
      <div className={"tablewrap"}>
        <table>
          <thead>
            <tr>
              <th>{"Assessment"}</th>
              <th>{"Patient record"}</th>
              <th>{"Date"}</th>
              <th>{"10-year estimate"}</th>
              <th>{"Risk group"}</th>
              <th>{"Action"}</th>
            </tr>
          </thead>
          <tbody>
            {withKeys(
              arr.map((r, _index) => (
                <Fragment key={_index}>
                  <tr>
                    <td>
                      {"AST-"}
                      {String(r.id).padStart(4, "0")}
                    </td>
                    <td>{patientIdent(P(r.pid))}</td>
                    <td>{dt(r.date)}</td>
                    <td>
                      <b>
                        {(r.risk * 100).toFixed(1)}
                        {"%"}
                      </b>
                    </td>
                    <td>{tag(r.band)}</td>
                    <td>
                      <button className={"link"} data-act={"record:" + r.id}>
                        {"View"}
                      </button>
                    </td>
                  </tr>
                </Fragment>
              )),
            )}
          </tbody>
        </table>
      </div>
      {arr.length ? (
        ""
      ) : (
        <>
          <div className={"empty"}>{"No matching assessments."}</div>
        </>
      )}
    </>
  );
}

export function phoneField(value = "") {
  return (
    <>
      <div className={"field phone-field"}>
        <label htmlFor={"phone"}>{"Contact number"}</label>
        <div className={"phone-control"}>
          <span className={"phone-prefix"} aria-hidden={"true"}>
            {"+63"}
          </span>
          <input
            id={"phone"}
            name={"phone"}
            type={"tel"}
            inputMode={"numeric"}
            autoComplete={"tel-national"}
            maxLength={10}
            minLength={10}
            pattern={"9[0-9]{9}"}
            defaultValue={esc(phoneDigits(value))}
            placeholder={"9XXXXXXXXX"}
          />
        </div>
      </div>
    </>
  );
}

export function guidanceHtml(items: Guidance[]) {
  return (
    <>
      <div className={"guidance-grid"}>
        {withKeys(
          items.map((g, i) => (
            <Fragment key={i}>
              <article className={"guidance-item"}>
                <div className={"guidance-no"}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className={"guidance-title"}>
                    {esc(g.title)}
                    {g.priority === "priority" ? (
                      <>
                        {" "}
                        <span className={"tag high"}>
                          {"Follow-up priority"}
                        </span>
                      </>
                    ) : (
                      ""
                    )}
                  </div>
                  <p className={"guidance-trigger"}>
                    <b>{"Based on:"}</b> {esc(g.trigger)}
                  </p>
                  <p className={"guidance-body"}>{esc(g.steps)}</p>
                </div>
              </article>
            </Fragment>
          )),
        )}
      </div>
    </>
  );
}
export function storedGuidance(r: AssessmentRecord) {
  return Array.isArray(r.guidanceRules)
    ? r.guidanceRules
    : r.inputs && P(r.pid)
      ? generateGuidance(r.inputs, P(r.pid)!)
      : [];
}
