import { styleFromText } from "../components/markup";
import { b, f } from "../components/shared";
import { S } from "../state/store";
import { esc } from "../utils/format";
export function LoginPage() {
  return (
    <>
      <div className={"login-screen"}>
        <section className={"hero"}>
          <div className={"logo"}>
            <span>{"♥"}</span>
            {"PINTIG"}
          </div>
          <div className={"hero-acronym"}>
            {
              "Predictive Intelligence for Non-Laboratory Ten-Year Individualized Grouping of Major Cardiovascular Event Risk Using Random Survival Forest"
            }
          </div>
          <h1>
            {"Better insight."}
            <br />
            {"Earlier awareness."}
          </h1>
          <p>
            {
              "Non-laboratory cardiovascular risk assessment and decision support."
            }
          </p>
          <div>
            <span className={"tag"}>{"Cardiovascular Risk Assessment"}</span>
          </div>
        </section>
        <section className={"login-side"}>
          <div className={"login-card"}>
            <div className={"eyebrow"}>{"Account access"}</div>
            <h2>{"Welcome back"}</h2>
            <p className={"muted"}>{"Sign in to access PINTIG."}</p>
            {S.message ? (
              <>
                <div
                  className={"feedback " + (S.error ? "error" : "")}
                  role={"status"}
                >
                  {esc(S.message)}
                </div>
              </>
            ) : (
              ""
            )}
            {S.reset ? (
              <>
                <div className={"notice warn"}>
                  {
                    "For help accessing your account, contact your system administrator."
                  }
                </div>
                {b("Back to sign in", "backLogin")}
              </>
            ) : (
              <>
                <div className={"demo-accounts"}>
                  <button type={"button"} data-act={"adminDemo"}>
                    <b>{"🛡 Administrator"}</b>
                  </button>
                  <button type={"button"} data-act={"workerDemo"}>
                    <b>{"♡ Healthcare Worker"}</b>
                  </button>
                </div>
                <form id={"loginForm"}>
                  {f("Email", "email", "", "email", true)}
                  {f("Password", "password", "", "password", true)}
                  <button type={"submit"} className={"btn primary wfull"}>
                    {"Sign in →"}
                  </button>
                </form>
                <div style={styleFromText("text-align:right;margin-top:10px")}>
                  {b("Forgot password?", "forgot")}
                </div>
              </>
            )}
            <div className={"separator"}></div>
            <div className={"tiny muted"}>
              {"Administrator and Healthcare Worker access"}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
