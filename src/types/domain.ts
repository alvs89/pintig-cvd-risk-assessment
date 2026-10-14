import type { CumulativeIncidenceOutput, ModelPredictionContext } from "./cif";
import type { FurtherAssessmentSnapshot } from "../services/furtherAssessment";
import type { PrototypeFollowUpSnapshot } from "../services/prototypeFollowUp";
export type Role = "admin" | "worker";
export type RiskBand = "Low" | "Moderate" | "High" | "Very High";
export type Page =
  | "Dashboard"
  | "Patient Management"
  | "New Risk Assessment"
  | "Assessment History"
  | "Reports"
  | "User Accounts"
  | "Audit Logs"
  | "Maintenance"
  | "Help"
  | "About"
  | "My Account";
export interface User {
  id: number;
  name: string;
  email: string;
  pass: string;
  role: Role;
  active: boolean;
}
export interface Patient {
  id: number;
  record: string;
  first: string;
  middle: string;
  last: string;
  dob: string;
  sex: string;
  locality: string;
  phone: string;
  pin: string;
  facility: string;
}
export type AssessmentInputs = Record<string, string>;
export type Factor = [name: string, contribution: number];
export interface Guidance {
  id: string;
  title: string;
  trigger: string;
  steps: string;
  priority: "standard" | "priority";
}
export interface Prediction {
  risk: number;
  bmi: number;
  parts: Factor[];
  predictionContext?: ModelPredictionContext;
  cif?: CumulativeIncidenceOutput;
}
export interface Result extends Prediction {
  pid: number;
  ageAtAssessment: number;
  inputs: AssessmentInputs;
  band: RiskBand;
  saved: boolean;
  guidanceRules?: Guidance[];
}
export interface AssessmentRecord {
  furtherAssessmentGuidance?: FurtherAssessmentSnapshot;
  prototypeFollowUpGuidance?: PrototypeFollowUpSnapshot;
  id: number;
  pid: number;
  uid: number;
  date: string;
  risk: number;
  band: RiskBand;
  model: string;
  inputs: AssessmentInputs;
  explanation: string;
  guidance: string;
  guidanceRules?: Guidance[];
  guidanceVersion?: string;
  riskBandVersion?: string;
  explanationVersion?: string;
  predictionContext?: ModelPredictionContext;
  cif?: CumulativeIncidenceOutput;
}
export interface AuditEntry {
  when: string;
  user: string;
  action: string;
}
export interface Confirmation {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
}
export interface Session {
  user: User | null;
  page: Page;
  patientId: number | null;
  editPatient: number | null;
  editUser: number | null;
  query: string;
  filter: string;
  draft: AssessmentInputs | null;
  result: Result | null;
  historyId: number | null;
  report: string;
  help: string;
  message: string;
  error: boolean;
  reset: boolean;
  revealedId: number | null;
  userQuery: string;
  userRole: string;
  userStatus: string;
  auditQuery: string;
  auditType: string;
  reportQuery: string;
  reportCategory: string;
  confirmation: Confirmation | null;
  formRevision: number;
  announcement: string;
}
/** Future model integration must implement this contract without changing risk bands or guidance. */
export interface PredictionService {
  readonly version: string;
  readonly status: "illustrative" | "validated";
  predict(inputs: AssessmentInputs, patient: Patient): Prediction;
}
