import { useSyncExternalStore } from "react";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { Workspace } from "./layouts/Workspace";
import { AssessmentPage } from "./pages/Assessment";
import { AuditPage } from "./pages/Audit";
import { DashboardPage } from "./pages/Dashboard";
import { HistoryPage, RecordPage } from "./pages/History";
import {
  AboutPage,
  AccountPage,
  HelpPage,
  MaintenancePage,
} from "./pages/Information";
import { LoginPage } from "./pages/Login";
import {
  PatientDetailsPage,
  PatientForm,
  PatientsPage,
} from "./pages/Patients";
import { ReportsPage } from "./pages/Reports";
import { ResultsPage } from "./pages/Results";
import { UserForm, UsersPage } from "./pages/Users";
import { handleClick, handleSubmit } from "./state/actions";
import { handleChange, handleInput, handlePaste } from "./state/formEvents";
import { getSnapshot, S, subscribe } from "./state/store";

function CurrentPage() {
  switch (S.page) {
    case "Dashboard":
      return <DashboardPage />;
    case "Patient Management":
      return S.editPatient !== null ? (
        <PatientForm />
      ) : S.patientId ? (
        <PatientDetailsPage />
      ) : (
        <PatientsPage />
      );
    case "New Risk Assessment":
      return S.result ? <ResultsPage /> : <AssessmentPage />;
    case "Assessment History":
      return S.historyId ? <RecordPage /> : <HistoryPage />;
    case "Reports":
      return <ReportsPage />;
    case "User Accounts":
      return S.editUser !== null ? <UserForm /> : <UsersPage />;
    case "Audit Logs":
      return <AuditPage />;
    case "Maintenance":
      return <MaintenancePage />;
    case "Help":
      return <HelpPage />;
    case "About":
      return <AboutPage />;
    case "My Account":
      return <AccountPage />;
  }
}
export default function App() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (
    <div
      onClick={(e) => {
        if (e.target instanceof Element)
          handleClick({ target: e.target as HTMLElement });
      }}
      onSubmit={(e) => {
        if (e.target instanceof HTMLFormElement)
          handleSubmit({
            target: e.target,
            preventDefault: () => e.preventDefault(),
          });
      }}
      onInput={(e) => handleInput(e.target as HTMLInputElement)}
      onChange={(e) => handleChange(e.target as HTMLInputElement)}
      onPaste={(e) => handlePaste(e)}
    >
      {S.user ? (
        <Workspace>
          <CurrentPage key={S.page + ":" + S.formRevision} />
        </Workspace>
      ) : (
        <LoginPage />
      )}
      <ConfirmationDialog />
    </div>
  );
}
