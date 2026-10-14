import { Fragment } from "react";
import { htmlAttributes, Select, withKeys } from "../components/markup";
import { b, f, head, sel, tag } from "../components/shared";
import { S, U, users } from "../state/store";
import type { User } from "../types/domain";
import { esc } from "../utils/format";
export function UsersPage() {
  const filtered = users.filter((u) => {
    const matchText = (u.name + " " + u.email)
      .toLowerCase()
      .includes(S.userQuery.trim().toLowerCase());
    const matchRole = S.userRole === "All" || u.role === S.userRole;
    const matchStatus =
      S.userStatus === "All" ||
      (S.userStatus === "Active" ? u.active : !u.active);
    return matchText && matchRole && matchStatus;
  });
  return (
    <>
      {head(
        "User and Access Management",
        "Manage authorized healthcare worker accounts.",
        b("+ Add healthcare worker", "newUser", "primary"),
      )}
      <div className={"panel"}>
        <div
          className={"toolbar pintig-table-filters"}
          role={"search"}
          aria-label={"Filter user accounts"}
        >
          <input
            className={"search"}
            id={"userSearch"}
            type={"search"}
            aria-label={"Search user accounts"}
            placeholder={"Search name or email"}
            value={S.userQuery}
            onChange={() => {}}
          />
          <Select
            className={"search"}
            id={"userRole"}
            aria-label={"Filter by user role"}
          >
            <option value={"All"}>{"All roles"}</option>
            <option
              value={"admin"}
              {...htmlAttributes(S.userRole === "admin" ? "selected" : "")}
            >
              {"Administrator"}
            </option>
            <option
              value={"worker"}
              {...htmlAttributes(S.userRole === "worker" ? "selected" : "")}
            >
              {"Healthcare Worker"}
            </option>
          </Select>
          <Select
            className={"search"}
            id={"userStatus"}
            aria-label={"Filter by account status"}
          >
            {withKeys(
              ["All", "Active", "Inactive"].map((v, _index) => (
                <Fragment key={_index}>
                  <option
                    {...htmlAttributes(S.userStatus === v ? "selected" : "")}
                  >
                    {v}
                  </option>
                </Fragment>
              )),
            )}
          </Select>
          {b("Clear", "clearUsers")}
        </div>
        <div id={"userLiveResults"} className={"pintig-live-results"}>
          <div className={"pintig-count"}>
            {filtered.length}
            {" of "}
            {users.length}
            {" accounts"}
          </div>
          <div className={"tablewrap"}>
            <table>
              <thead>
                <tr>
                  <th>{"Name"}</th>
                  <th>{"Email"}</th>
                  <th>{"Role"}</th>
                  <th>{"Status"}</th>
                  <th>{"Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {withKeys(
                  filtered.map((u, _index) => (
                    <Fragment key={_index}>
                      <tr>
                        <td>{esc(u.name)}</td>
                        <td>{esc(u.email)}</td>
                        <td>
                          {u.role === "admin"
                            ? "Administrator"
                            : "Healthcare Worker"}
                        </td>
                        <td>{tag(u.active ? "Active" : "Inactive")}</td>
                        <td>
                          <button
                            className={"link"}
                            data-act={"editUser:" + u.id}
                          >
                            {"Edit"}
                          </button>{" "}
                          {u.id === S.user!.id ? (
                            ""
                          ) : (
                            <>
                              {"· "}
                              <button
                                className={"link"}
                                data-act={"toggleUser:" + u.id}
                              >
                                {u.active ? "Deactivate" : "Activate"}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  )),
                )}
              </tbody>
            </table>
          </div>
          {filtered.length ? (
            ""
          ) : (
            <>
              <div className={"empty"}>
                {"No accounts match these filters."}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function UserForm() {
  let u: Partial<User> = U(S.editUser) || {};
  return (
    <>
      {head(
        u.id ? "Edit User Account" : "Register Healthcare Worker",
        "Manage account details and access roles.",
        b("← User Accounts", "nav:User Accounts"),
      )}
      <div className={"panel"}>
        <form id={"userForm"}>
          <div className={"gridform"}>
            {f("Full name", "name", u.name, "text", true)}
            {f("Email", "email", u.email, "email", true)}
            {sel(
              "Access role",
              "role",
              u.id
                ? [
                    ["admin", "Administrator"],
                    ["worker", "Healthcare Worker"],
                  ]
                : [["worker", "Healthcare Worker"]],
              u.role || "worker",
            )}
            {f(
              u.id ? "New password (optional)" : "Temporary password",
              "pass",
              "",
              "password",
              !u.id,
              'autocomplete="new-password"',
            )}
          </div>
          <div className={"actions"}>
            <button className={"btn primary"} type={"submit"}>
              {"Save account"}
            </button>
            {b("Cancel", "nav:User Accounts")}
          </div>
        </form>
      </div>
    </>
  );
}
