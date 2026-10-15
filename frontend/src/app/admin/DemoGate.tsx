"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { demoSwitch } from "@/lib/api";
import { DEMO_PASSWORD, DEMO_USER, resetDemoData } from "@/lib/demo-admin";
import AdminShell from "./AdminShell";

const SESSION = "rise-demo-admin-session";

// Used when no backend can be reached. A simple username and password opens the dashboard on sample data.
export default function DemoGate({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION) === "1") setSignedIn(true);
    } catch {}
    setReady(true);
  }, []);

  // Must be on before the dashboard pages mount and load their data, so set it during render.
  demoSwitch.active = signedIn;
  useEffect(() => () => void (demoSwitch.active = false), []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (user.trim().toLowerCase() === DEMO_USER && password === DEMO_PASSWORD) {
      try {
        sessionStorage.setItem(SESSION, "1");
      } catch {}
      setSignedIn(true);
    } else setError("Wrong username or password.");
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION);
    } catch {}
    setSignedIn(false);
    setPassword("");
  }

  if (!ready) return <div className="gate"><p>Loading…</p></div>;

  if (!signedIn)
    return (
      <div className="gate">
        <form className="box" onSubmit={submit}>
          <div className="brand">RISE ADMIN</div>
          <p className="sub">Demo mode. No backend is connected, so the dashboard runs on sample data.</p>
          <div className="msg ok">
            Username: <b>{DEMO_USER}</b>
            <br />
            Password: <b>{DEMO_PASSWORD}</b>
          </div>
          {error && <div className="msg error">{error}</div>}
          <div className="f"><label htmlFor="du">Username</label><input id="du" type="text" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" required /></div>
          <div className="f"><label htmlFor="dp">Password</label><input id="dp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
          <button className="btn-a" style={{ width: "100%" }}>Sign in</button>
        </form>
      </div>
    );

  return (
    <AdminShell
      who="admin (demo)"
      onLogout={logout}
      banner={
        <div className="demo-banner">
          <span>
            <b>DEMO</b> &nbsp;Sample data saved in this browser only. Nothing here affects the real store.
          </span>
          <button className="btn-a ghost sm" onClick={() => { resetDemoData(); location.reload(); }}>Reset sample data</button>
        </div>
      }
    >
      {children}
    </AdminShell>
  );
}
