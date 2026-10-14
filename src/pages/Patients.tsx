import { Fragment } from "react";
import { withKeys } from "../components/markup";
import {
  b,
  f,
  head,
  patientIdent,
  phoneField,
  recordsTable,
  sel,
} from "../components/shared";
import { isRevealed } from "../state/permissions";
import { P, patients, records, S } from "../state/store";
import type { Patient } from "../types/domain";
import { esc } from "../utils/format";
export function PatientsPage() {
  const list = patients.filter((p) =>
    p.record.toLowerCase().includes(S.query.trim().toLowerCase()),
  );
  return (
    <>
      {head(
        "Patient Management",
        "Patient names are concealed by default. Use the eye icon to verify identity.",
        b("+ Register Patient", "newPatient", "primary"),
      )}
      <div className={"panel"}>
        <div
          className={"toolbar pintig-table-filters"}
          role={"search"}
          aria-label={"Search patient records"}
        >
          <input
            className={"search"}
            type={"search"}
            id={"patientQuery"}
            aria-label={"Search patient records"}
            placeholder={"Search by Patient Record Number"}
            value={S.query}
            onChange={() => {}}
          />
          {b("Clear", "clearPatient")}
        </div>
        <div id={"patientLiveResults"} className={"pintig-live-results"}>
          <div className={"pintig-count"}>
            {list.length}
            {" of "}
            {patients.length}
            {" patients"}
          </div>
          <div className={"tablewrap"}>
            <table>
              <thead>
                <tr>
                  <th>{"Patient ID"}</th>
                  <th>{"Identity"}</th>
                  <th>{"Facility"}</th>
                  <th>{"Record status"}</th>
                  <th>{"Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {withKeys(
                  list.map((p, _index) => (
                    <Fragment key={_index}>
                      <tr>
                        <td>
                          <b className={"patient-code"}>{p.record}</b>
                        </td>
                        <td>{patientIdent(p, false)}</td>
                        <td>{esc(p.facility)}</td>
                        <td>{"Active"}</td>
                        <td>
                          <button
                            className={"link"}
                            data-act={"openPatient:" + p.id}
                          >
                            {"Open"}
                          </button>
                          {" · "}
                          <button
                            className={"link"}
                            data-act={"editPatient:" + p.id}
                          >
                            {"Edit"}
                          </button>
                          {" · "}
                          <button
                            className={"link"}
                            data-act={"assessPatient:" + p.id}
                          >
                            {"Assess"}
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {list.length ? (
            ""
          ) : (
            <>
              <div className={"empty"}>{"No patients match your search."}</div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function PatientForm() {
  let p: Partial<Patient> = P(S.editPatient) || {};
  if (p.id && !isRevealed(p))
    return (
      <>
        {head(
          "Edit patient " + p.record,
          "Verify patient identity to edit personal details.",
          b("← Patients", "nav:Patient Management"),
        )}
        <section className={"panel"}>
          <h2>{"Identity verification"}</h2>
          <p>
            {
              "Patient identifying fields remain concealed until explicitly revealed."
            }
          </p>
          <div className={"identity-context"}>{patientIdent(p)}</div>
        </section>
      </>
    );
  return (
    <>
      {head(
        p.id ? "Edit patient profile" : "Register new patient",
        p.id
          ? "Review and update patient information."
          : "Enter the patient’s identification and contact details.",
        b("← Patient Management", "nav:Patient Management"),
      )}
      <section className={"panel"}>
        <form id={"patientForm"}>
          <h2>{"Patient information"}</h2>
          <div className={"patient-name-grid"}>
            {f(
              "First name",
              "first",
              p.first,
              "text",
              true,
              'autocomplete="given-name" spellcheck="false"',
            )}
            {f(
              "Middle name",
              "middle",
              p.middle,
              "text",
              false,
              'autocomplete="additional-name" spellcheck="false"',
            )}
            {f(
              "Last name",
              "last",
              p.last,
              "text",
              true,
              'autocomplete="family-name" spellcheck="false"',
            )}
          </div>
          <div className={"patient-personal-grid"}>
            {f(
              "Date of birth",
              "dob",
              p.dob,
              "date",
              true,
              'autocomplete="bday"',
            )}
            {sel("Sex", "sex", ["Male", "Female"], p.sex || "Male")}
            {phoneField(p.phone)}
          </div>
          <div className={"patient-address-row"}>
            {f(
              "Address / locality",
              "locality",
              p.locality,
              "text",
              true,
              'autocomplete="street-address"',
            )}
          </div>
          <div className={"patient-admin-grid"}>
            {f(
              "PhilHealth PIN (optional)",
              "pin",
              p.pin,
              "text",
              false,
              'inputmode="numeric" maxlength="12" autocomplete="off"',
            )}
            {f(
              "Healthcare facility",
              "facility",
              p.facility || "",
              "text",
              false,
              'placeholder="Enter facility name"',
            )}
          </div>
          <div className={"notice"}>
            {"PINTIG Record Number: "}
            <b>{p.record || "Automatically generated upon registration"}</b>
            {"."}
          </div>
          <div className={"actions"}>
            <button className={"btn primary"} type={"submit"}>
              {p.id ? "Save changes" : "Register patient"}
            </button>
            {b("Cancel", "nav:Patient Management")}
          </div>
        </form>
      </section>
    </>
  );
}

export function PatientDetailsPage() {
  let p = P(S.patientId);
  if (!p) return <PatientsPage />;
  const show = isRevealed(p);
  return (
    <>
      {head(
        "Patient " + p.record,
        "Patient profile · Identifying information hidden by default",
        b("← Patients", "nav:Patient Management"),
      )}
      <div className={"twocol"}>
        <div className={"panel"}>
          <h2>{"Patient identity"}</h2>
          <div className={"identity-context"}>{patientIdent(p)}</div>
          <p className={"identity-notice"}>
            {
              "Use the eye control to verify identity only when required for your task."
            }
          </p>
          <p>
            <b>{"Date of birth:"}</b> {show ? esc(p.dob) : "Hidden"}
            <br />
            <b>{"Sex:"}</b> {esc(p.sex)}
            <br />
            <b>{"Contact number:"}</b>{" "}
            {show ? esc(p.phone || "Not recorded") : "Hidden"}
            <br />
            <b>{"PhilHealth PIN:"}</b>{" "}
            {show ? esc(p.pin || "Not recorded") : "Hidden"}
            <br />
            <b>{"Locality:"}</b> {show ? esc(p.locality) : "Hidden"}
            <br />
            <b>{"Facility:"}</b> {esc(p.facility)}
          </p>
          <div className={"actions"}>
            {b("Edit profile", "editPatient:" + p.id)}
            {b("New risk assessment", "assessPatient:" + p.id, "primary")}
          </div>
        </div>
        <div className={"panel"}>
          <h2>{"Assessment overview"}</h2>
          <div className={"risk"}>
            {records.filter((r) => r.pid === p.id).length}
          </div>
          <div className={"muted"}>{"Saved assessments"}</div>
          <p className={"tiny"}>
            {"Review each assessment separately in the patient’s history."}
          </p>
        </div>
      </div>
      <div className={"panel"}>
        <h2>{"Assessment history"}</h2>
        {recordsTable(records.filter((r) => r.pid === p.id))}
      </div>
    </>
  );
}
