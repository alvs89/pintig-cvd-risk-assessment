import { download } from "../services/export";
import { flushSync } from "react-dom";
import { generateGuidance } from "../services/guidance";
import { deriveInputs } from "../services/intake";
import { hasIntakeAnswers, seededIntake } from "./seededIntakes";
import { simulate } from "../services/prediction";
import { reportRows } from "../services/reports";
import { createSnapshot } from "../services/snapshots";
import type { Confirmation, Page, Patient } from "../types/domain";
import { age } from "../utils/format";
import { band } from "../utils/risk";
import { adminActions, allowedPages, canReveal } from "./permissions";
import {
  log,
  logs,
  msg,
  P,
  patients,
  records,
  render,
  S,
  U,
  users,
} from "./store";
export type ActionEvent = { target: HTMLElement };
export type FormEvent = { target: HTMLFormElement; preventDefault: () => void };
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const formById = (id: string) =>
  document.getElementById(id) as HTMLFormElement | null;
const field = (form: HTMLFormElement, key: string) =>
  form.elements.namedItem(key) as HTMLInputElement | null;
export const formValues = (form: HTMLFormElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(new FormData(form), ([k, v]) => [k, String(v)]),
  );
function updateQuestionnaire() {
  const form = formById("assessmentForm");
  if (form) {
    const x = deriveInputs(formValues(form));
    for (const key of [
      "bmi",
      "alcoholDays",
      "drinksPerDay",
      "alcoholDrinks",
      "activityMinutes",
    ]) {
      const input = field(form, key);
      if (input) input.value = x[key] ?? "";
    }
    S.draft = x;
  }
}
export function openPintigConfirm(
  options: Omit<Confirmation, "actionLabel"> & { actionLabel?: string },
) {
  S.confirmation = { ...options, actionLabel: options.actionLabel ?? "Clear" };
  render();
}
export function go(page: string) {
  if (!S.user || !allowedPages(S.user.role).includes(page as Page)) {
    msg("Access denied for this role.", true);
    return render();
  }
  S.page = page as Page;
  if (page === "New Risk Assessment" && P(S.draft?.pid)) {
    S.patientId = Number(S.draft!.pid);
  }
  S.revealedId = null;
  S.editPatient = null;
  S.editUser = null;
  S.historyId = null;
  S.result = null;
  S.query = "";
  S.message = "";
  S.formRevision++;
  render();
}
export function handleClick(e: ActionEvent) {
  let el = e.target.closest<HTMLElement>("[data-act]");
  if (!el) return;
  let raw = el.dataset.act!,
    i = raw.indexOf(":"),
    action = i < 0 ? raw : raw.slice(0, i),
    arg = i < 0 ? "" : raw.slice(i + 1);
  if (adminActions.has(action) && S.user?.role !== "admin") {
    msg("Access denied for this role.", true);
    return render();
  }
  if (
    !S.user &&
    !["adminDemo", "workerDemo", "forgot", "backLogin"].includes(action)
  )
    return;
  if (action === "revealIdentity") {
    const p = P(arg);
    if (!p || !canReveal(p)) {
      log("Denied patient identity reveal attempt");
      msg("You do not have permission to view that identity.", true);
      return render();
    }
    const ass = formById("assessmentForm"),
      appScroll = document.querySelector(".appmain")?.scrollTop || 0,
      sideScroll = document.querySelector(".sidebar")?.scrollTop || 0;
    if (ass) {
      updateQuestionnaire();
      S.draft = formValues(ass);
      S.patientId = +(field(ass, "pid")?.value || 0) || null;
    }
    const showing = S.revealedId !== p.id;
    S.revealedId = showing ? p.id : null;
    if (showing) log("Patient identity revealed: " + p.record);
    else log("Patient identity hidden: " + p.record);
    render();
    const sc = document.querySelector(".appmain"),
      side = document.querySelector(".sidebar");
    if (sc) sc.scrollTop = appScroll;
    if (side) side.scrollTop = sideScroll;
    let el = document.querySelector<HTMLElement>(
      '[data-act="revealIdentity:' + p.id + '"]',
    );
    if (el) el.focus({ preventScroll: true });
    return;
  }
  if (action === "adminDemo" || action === "workerDemo") {
    const email = $("email"),
      pass = $("password");
    if (email && pass) {
      email.value =
        action === "adminDemo" ? "admin@pintig.demo" : "worker@pintig.demo";
      pass.value = action === "adminDemo" ? "Admin123!" : "Worker123!";
    }
    return;
  }
  if (action === "forgot") {
    S.reset = true;
    return render();
  }
  if (action === "backLogin") {
    S.reset = false;
    S.message = "";
    return render();
  }
  if (action === "logout" || action === "switchRole") {
    const switchRole = action === "switchRole";
    openPintigConfirm({
      title: switchRole ? "Switch account?" : "Sign out?",
      description: switchRole
        ? "You will be signed out of your current account and returned to the sign-in page."
        : "You will be signed out of PINTIG and returned to the sign-in page.",
      actionLabel: switchRole ? "Switch account" : "Sign out",
      onConfirm: () => {
        log("Logged out");
        S.revealedId = null;
        S.user = null;
        S.patientId = null;
        S.historyId = null;
        S.result = null;
        S.draft = null;
        S.editPatient = null;
        S.editUser = null;
        S.page = "Dashboard";
        render();
      },
    });
    return;
  }
  if (action === "nav") {
    S.revealedId = null;
    S.patientId = null;
    return go(arg);
  }
  if (action === "newPatient") {
    S.formRevision++;
    S.page = "Patient Management";
    S.patientId = null;
    S.editPatient = 0;
    return render();
  }
  if (action === "editPatient") {
    S.page = "Patient Management";
    S.patientId = null;
    S.editPatient = +arg;
    return render();
  }
  if (action === "openPatient") {
    S.revealedId = null;
    S.page = "Patient Management";
    S.patientId = +arg;
    S.editPatient = null;
    return render();
  }
  if (action === "assessPatient") {
    if (!P(arg)) return;
    const open = () => {
      if (Number(S.draft?.pid) !== +arg) S.draft = null;
      S.revealedId = null;
      S.patientId = +arg;
      S.page = "New Risk Assessment";
      S.result = null;
      S.formRevision++;
      render();
    };
    if (Number(S.draft?.pid) !== +arg && hasIntakeAnswers(S.draft)) {
      openPintigConfirm({
        title: "Start an assessment for another patient?",
        description:
          "This will replace the unsaved questionnaire answers. Saved assessments will not be affected.",
        actionLabel: "Continue",
        onConfirm: open,
      });
      return;
    }
    return open();
  }
  if (action === "loadRecordedIntake") {
    const input = S.patientId ? seededIntake(S.patientId) : undefined;
    if (!input || !formById("assessmentForm")) return;
    const load = () => {
      S.draft = input;
      S.result = null;
      S.formRevision++;
      msg("Review and confirm the recorded intake before continuing.");
      render();
    };
    if (hasIntakeAnswers(S.draft)) {
      openPintigConfirm({
        title: "Replace questionnaire answers?",
        description:
          "Loading the recorded intake will replace the current unsaved answers. You can review and edit the loaded information before submitting.",
        actionLabel: "Load intake",
        onConfirm: load,
      });
      return;
    }
    return load();
  }
  if (action === "searchPatient") {
    S.revealedId = null;
    S.query = $("patientQuery").value;
    return render();
  }
  if (action === "clearPatient") {
    S.revealedId = null;
    S.query = "";
    return render();
  }
  if (action === "filterHistory") {
    S.revealedId = null;
    S.query = $("historySearch").value;
    S.filter = $("historyCategory").value;
    return render();
  }
  if (action === "clearHistory") {
    S.revealedId = null;
    S.query = "";
    S.filter = "All";
    return render();
  }
  if (action === "record") {
    S.revealedId = null;
    S.page = "Assessment History";
    S.historyId = +arg;
    return render();
  }
  if (action === "loadSample") {
    const form = formById("assessmentForm");
    if (!form) return;
    const data = {
      prior: "No",
      verified: "Yes",
      sbp: "132",
      dbp: "82",
      height: "168",
      weight: "71.4",
      waist: "88",
      currentSmoking: "No",
      bpMeds: "No",
      diabetesHistory: "No",
      pastBpMeds: "No",
      mode: "extended",
      alcoholUse: "Yes",
      alcoholDays: "1",
      drinksPerDay: "2",
      activityDays: "3",
      activityPerDay: "60",
      walkingPace: "Average",
      fruitVeg: "3",
      wholeGrain: "1",
      saltFrequency: "Sometimes",
      processedFood: "Sometimes",
      family: "No",
      education: "Secondary",
      employment: "Employed",
    };
    S.draft = deriveInputs({ ...formValues(form), ...data });
    S.patientId = Number(S.draft.pid) || null;
    S.formRevision++;
    msg("Review the patient and assessment information before continuing.");
    render();
    return;
  }
  if (action === "resetAssessment") {
    openPintigConfirm({
      title: "Clear assessment?",
      description:
        "This will remove the information entered in the current assessment. Saved assessment records will not be affected.",
      actionLabel: "Clear",
      onConfirm: () => {
        S.draft = null;
        S.result = null;
        S.formRevision++;
        msg("Assessment form cleared.");
        render();
      },
    });
    return;
  }
  if (action === "saveAssessment") {
    if (!S.result || S.result.saved) return;
    const r = S.result;
    const rec = createSnapshot(
      r,
      Math.max(0, ...records.map((x) => x.id)) + 1,
      S.user!.id,
    );
    records.push(rec);
    r.saved = true;
    log("Saved assessment AST-" + rec.id);
    msg("Assessment saved successfully.");
    return render();
  }
  if (action === "newUser") {
    S.formRevision++;
    S.editUser = 0;
    return render();
  }
  if (action === "editUser") {
    S.editUser = +arg;
    return render();
  }
  if (action === "toggleUser") {
    let u = U(+arg);
    if (!u || u.id === S.user!.id) return;
    if (u.active) {
      openPintigConfirm({
        title: "Deactivate account?",
        description:
          "This user will no longer be able to sign in until the account is reactivated.",
        actionLabel: "Deactivate",
        onConfirm: () => {
          u.active = false;
          log("Deactivated account: " + u.email);
          msg("User account deactivated.");
          render();
        },
      });
      return;
    }
    u.active = true;
    log("Activated account: " + u.email);
    msg("User account activated.");
    return render();
  }
  if (action === "filterUsers") {
    S.userQuery = $("userSearch").value;
    S.userRole = $("userRole").value;
    S.userStatus = $("userStatus").value;
    return render();
  }
  if (action === "clearUsers") {
    S.userQuery = "";
    S.userRole = "All";
    S.userStatus = "All";
    return render();
  }
  if (action === "filterAudit") {
    S.auditQuery = $("auditSearch").value;
    S.auditType = $("auditType").value;
    return render();
  }
  if (action === "clearAudit") {
    S.auditQuery = "";
    S.auditType = "All";
    return render();
  }
  if (action === "clearReport") {
    S.reportQuery = "";
    S.reportCategory = "All";
    return render();
  }
  if (action === "generateReport") {
    S.revealedId = null;
    S.report = $("reportType").value;
    S.reportQuery = $("reportSearch").value;
    S.reportCategory =
      S.report === "Patients" ? "All" : $("reportCategory").value;
    return render();
  }
  if (action === "exportCSV") {
    S.report = $("reportType").value;
    S.reportQuery = $("reportSearch").value;
    S.reportCategory =
      S.report === "Patients" ? "All" : $("reportCategory").value;
    const rows = reportRows();
    const arr =
      S.report === "Patients"
        ? [
            ["Patient record", "Sex", "Facility"],
            ...reportRows("Patients").map((p) => [p.record, p.sex, p.facility]),
          ]
        : [
            ["Assessment", "Patient record", "Risk", "Category"],
            ...reportRows("Assessments").map((r) => [
              "AST-" + r.id,
              P(r.pid)?.record || "",
              (r.risk * 100).toFixed(1),
              r.band,
            ]),
          ];
    download(
      "PINTIG_" + S.report + ".csv",
      arr
        .map((row) =>
          row.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(","),
        )
        .join("\n"),
      "text/csv",
    );
    msg(rows.length + " records exported.");
    return render();
  }
  if (action === "backup") {
    download(
      "PINTIG_Records.json",
      JSON.stringify(
        {
          users: users.map(({ pass, ...x }) => x),
          patients: patients.map(
            ({ first, middle, last, dob, locality, phone, pin, ...rest }) =>
              rest,
          ),
          records,
          logs,
        },
        null,
        2,
      ),
      "application/json",
    );
    log("Exported system records");
    msg("Records exported successfully.");
    return render();
  }
  if (action === "help") {
    S.help = arg;
    return render();
  }
  if (action === "print") {
    flushSync(() => {
      S.revealedId = null;
      render();
    });
    return window.print();
  }
}
export function handleSubmit(e: FormEvent) {
  e.preventDefault();
  const form = e.target;
  if (form.id === "loginForm") {
    let email = $("email").value.trim().toLowerCase(),
      pass = $("password").value;
    let u = users.find((x) => x.email === email && x.pass === pass && x.active);
    if (!u) {
      msg("Invalid email/password, or account is inactive.", true);
      return render();
    }
    S.user = u;
    S.page = "Dashboard";
    S.message = "";
    log("Signed in successfully");
    return render();
  }
  if (form.id === "patientForm") {
    if (!S.user) return;
    let d = formValues(form),
      existing = P(S.editPatient),
      pin = d.pin.trim();
    if (d.phone && !/^9\d{9}$/.test(d.phone)) {
      msg(
        "Enter a valid Philippine mobile number: 10 digits beginning with 9, after +63.",
        true,
      );
      return render();
    }
    d.phone = d.phone ? "+63" + d.phone : "";
    if (
      !d.first.trim() ||
      !d.last.trim() ||
      !d.locality.trim() ||
      !d.dob ||
      new Date(d.dob) > new Date()
    ) {
      msg(
        "Complete the required patient fields with a valid birth date.",
        true,
      );
      return render();
    }
    if (pin && !/^\d{12}$/.test(pin)) {
      msg("Enter a 12-digit PhilHealth PIN, or leave it blank.", true);
      return render();
    }
    if (pin && patients.some((p) => p.pin === pin && p.id !== existing?.id)) {
      msg("PhilHealth PIN already assigned to another patient.", true);
      return render();
    }
    if (existing) {
      Object.assign(existing, d);
      S.patientId = existing.id;
      log("Updated patient " + existing.record);
    } else {
      let id = Math.max(0, ...patients.map((x) => x.id)) + 1;
      patients.push({
        id,
        record: "PNT-" + String(id).padStart(6, "0"),
        ...d,
      } as unknown as Patient);
      S.patientId = id;
      log("Registered patient PNT-" + String(id).padStart(6, "0"));
    }
    S.editPatient = null;
    msg("Patient profile saved.");
    return render();
  }
  if (form.id === "userForm") {
    if (S.user?.role !== "admin") return;
    let d = formValues(form),
      u = U(S.editUser),
      email = d.email.trim().toLowerCase();
    if (!d.name.trim() || !email.includes("@")) {
      msg("Enter valid user details.", true);
      return render();
    }
    if (users.some((x) => x.email === email && x.id !== u?.id)) {
      msg("Email already registered.", true);
      return render();
    }
    if (u) {
      u.name = d.name;
      u.email = email;
      u.role = d.role === "admin" ? "admin" : "worker";
      if (d.pass) u.pass = d.pass;
      log("Edited user account " + email);
    } else {
      if (d.pass.length < 8) {
        msg("Temporary password must be at least eight characters.", true);
        return render();
      }
      users.push({
        id: Math.max(...users.map((x) => x.id)) + 1,
        name: d.name,
        email,
        pass: d.pass,
        role: "worker",
        active: true,
      });
      log("Created healthcare worker " + email);
    }
    S.editUser = null;
    msg("Account saved.");
    return render();
  }
  if (form.id === "assessmentForm") {
    if (!S.user) return;
    updateQuestionnaire();
    let x = formValues(form),
      p = P(x.pid);
    S.patientId = p?.id || null;
    S.draft = x;
    const fail = (message: string) => {
      msg(message, true);
      render();
    };
    if (!p) return fail("Choose a patient before starting the assessment.");
    if (age(p.dob) < 35 || age(p.dob) > 70)
      return fail(
        "The patient is outside the supported 35–70 baseline age range.",
      );
    if (x.prior !== "No" || x.verified !== "Yes")
      return fail(
        "Confirm patient eligibility and the absence of previous major-CVD events.",
      );
    if (
      x.sbp === "" ||
      x.dbp === "" ||
      +x.sbp < 70 ||
      +x.sbp > 260 ||
      +x.dbp < 40 ||
      +x.dbp > 160 ||
      +x.dbp >= +x.sbp
    )
      return fail(
        "Enter valid systolic and diastolic blood pressure readings.",
      );
    if (x.bmi === "" || +x.bmi < 12 || +x.bmi > 65)
      return fail(
        "Enter height and weight, or an existing verified BMI value.",
      );
    if (!["Yes", "No"].includes(x.currentSmoking))
      return fail("Confirm whether the patient currently smokes cigarettes.");
    if (!["Yes", "No"].includes(x.bpMeds))
      return fail(
        "Confirm whether the patient currently takes blood-pressure medication.",
      );
    if (x.mode === "extended") {
      if (
        !["Yes", "No"].includes(x.alcoholUse) ||
        x.alcoholDays === "" ||
        x.drinksPerDay === ""
      )
        return fail(
          "Complete the alcohol-use questions, entering zero when appropriate.",
        );
      if (x.activityDays === "" || x.activityPerDay === "")
        return fail(
          "Complete the weekly physical-activity questions, entering zero when appropriate.",
        );
      if (
        +x.alcoholDays < 0 ||
        +x.alcoholDays > 7 ||
        +x.activityDays < 0 ||
        +x.activityDays > 7
      )
        return fail(
          "Weekly activity and drinking days must be between 0 and 7.",
        );
    } else {
      [
        "alcoholUse",
        "alcoholDays",
        "drinksPerDay",
        "alcoholDrinks",
        "activityDays",
        "activityPerDay",
        "activityMinutes",
        "walkingPace",
        "fruitVeg",
        "wholeGrain",
        "saltFrequency",
        "processedFood",
        "family",
        "education",
        "employment",
      ].forEach((k) => {
        x[k] = "";
      });
    }
    let out = simulate(x, p);
    S.result = {
      ...out,
      pid: p.id,
      ageAtAssessment: age(p.dob),
      inputs: x,
      band: band(out.risk),
      saved: false,
      guidanceRules: generateGuidance(x, p),
    };
    S.page = "New Risk Assessment";
    S.message = "";
    log(
      "Calculated an illustrative cardiovascular risk estimate for " + p.record,
    );
    // Commit the result before resetting either desktop pane or mobile document
    // scrolling. An immediate reset avoids animating through the replaced form.
    flushSync(() => render());
    const main = document.querySelector<HTMLElement>(".appmain");
    main?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.scrollTo({
      top: main ? window.scrollY + main.getBoundingClientRect().top : 0,
      left: 0,
      behavior: "instant",
    });
    const heading = main?.querySelector<HTMLElement>(".maincontent h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
    return;
  }
}
