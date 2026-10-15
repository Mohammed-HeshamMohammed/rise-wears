"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, adminSession, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { devAuth, firebaseConfigured } from "@/lib/firebase";

type Phase = "checking" | "login" | "denied" | "setup" | "code" | "ready";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
  ["/admin/deals", "Deals & promo codes"],
  ["/admin/announcements", "Announcement bar"],
  ["/admin/shipping", "Shipping rates"],
  ["/admin/people", "Customers & inbox"],
] as const;

// Three locks: a login, the admin role, and an authenticator code. The backend re-checks all three on every request.
export default function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signInWithGoogle, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const path = usePathname();

  const check = useCallback(async () => {
    if (!user) return setPhase("login");
    try {
      if (adminSession.get()) {
        await api("/admin/stats", { admin: true });
        return setPhase("ready");
      }
      const s = await api<{ enrolled: boolean }>("/admin/auth/status", { auth: true });
      setPhase(s.enrolled ? "code" : "setup");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) return setPhase("denied");
      if (e instanceof ApiError && e.status === 401 && adminSession.get() === null) {
        try {
          const s = await api<{ enrolled: boolean }>("/admin/auth/status", { auth: true });
          return setPhase(s.enrolled ? "code" : "setup");
        } catch (e2) {
          if (e2 instanceof ApiError && e2.status === 403) return setPhase("denied");
        }
      }
      setPhase("code");
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    setPhase("checking");
    check();
  }, [loading, check]);

  useEffect(() => {
    const onExpired = () => check();
    window.addEventListener("rise-admin-expired", onExpired);
    return () => window.removeEventListener("rise-admin-expired", onExpired);
  }, [check]);

  if (phase === "checking" || loading) return <div className="gate"><p>Loading…</p></div>;
  if (phase === "login") return <LoginBox signIn={signIn} google={firebaseConfigured ? signInWithGoogle : null} />;
  if (phase === "denied")
    return (
      <div className="gate">
        <div className="box">
          <div className="brand">RISE ADMIN</div>
          <p className="msg error" style={{ marginTop: 16 }}>This account doesn't have admin access.</p>
          <button className="btn-a ghost" onClick={() => signOut()}>Log out</button>
        </div>
      </div>
    );
  if (phase === "setup") return <Setup onDone={() => setPhase("ready")} />;
  if (phase === "code") return <CodeBox onDone={() => setPhase("ready")} onLogout={() => signOut()} />;

  return (
    <div className="adm-layout">
      <aside className="adm-side">
        <div className="brand">
          RISE<small>ADMIN DASHBOARD</small>
        </div>
        <nav>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={path === href || (href !== "/admin" && path.startsWith(href)) ? "on" : ""}>
              {label}
            </Link>
          ))}
          <Link href="/" target="_blank">
            View store ↗
          </Link>
        </nav>
        <div className="foot">
          {user?.email}
          <br />
          <button className="btn-a ghost sm" onClick={() => { adminSession.clear(); signOut(); }}>
            Log out
          </button>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}

function LoginBox({ signIn, google }: { signIn: (e: string, p: string) => Promise<void>; google: null | (() => Promise<void>) }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="gate">
      <form className="box" onSubmit={(e: FormEvent) => { e.preventDefault(); run(() => signIn(email, password)); }}>
        <div className="brand">RISE ADMIN</div>
        <p className="sub">Sign in with your admin account.</p>
        {devAuth && !firebaseConfigured && <div className="msg ok">Test admin: admin@rise.test (leave the password empty). You will set up two-step verification on the first login.</div>}
        {error && <div className="msg error">{error}</div>}
        <div className="f"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></div>
        <div className="f"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
        <button className="btn-a" disabled={busy} style={{ width: "100%" }}>Continue</button>
        {google && (
          <button type="button" className="btn-a ghost" disabled={busy} style={{ width: "100%", marginTop: 10 }} onClick={() => run(google)}>
            Continue with Google
          </button>
        )}
      </form>
    </div>
  );
}

function CodeBox({ onDone, onLogout }: { onDone: () => void; onLogout: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ session: string }>("/admin/auth/verify", { auth: true, body: { code } });
      adminSession.set(r.session);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify.");
      setBusy(false);
    }
  }
  return (
    <div className="gate">
      <form className="box" onSubmit={submit}>
        <div className="brand">RISE ADMIN</div>
        <h2 style={{ marginTop: 16 }}>Two-step verification</h2>
        <p className="sub">Open your authenticator app and enter the 6-digit code for RISE Admin. Lost your phone? Use one of your backup codes.</p>
        {error && <div className="msg error">{error}</div>}
        <div className="f"><input className="code-in plain" autoFocus value={code} onChange={(e) => setCode(e.target.value)} inputMode="text" autoComplete="one-time-code" placeholder="000000" required /></div>
        <button className="btn-a" disabled={busy} style={{ width: "100%" }}>Verify</button>
        <p style={{ marginTop: 14 }}><a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>Use a different account</a></p>
      </form>
    </div>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [data, setData] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [backup, setBackup] = useState<{ codes: string[]; session: string } | null>(null);

  useEffect(() => {
    api<{ qr: string; secret: string }>("/admin/auth/setup", { auth: true, method: "POST", body: {} })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await api<{ session: string; backupCodes: string[] }>("/admin/auth/setup/confirm", { auth: true, body: { code } });
      setBackup({ codes: r.backupCodes, session: r.session });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong code.");
    }
  }

  if (backup)
    return (
      <div className="gate">
        <div className="box">
          <div className="brand">RISE ADMIN</div>
          <h2 style={{ marginTop: 16 }}>Save your backup codes</h2>
          <p className="sub">Each code works once if you lose your phone. They are shown only now — store them somewhere safe.</p>
          <div className="codes">{backup.codes.map((c) => <span key={c}>{c}</span>)}</div>
          <button className="btn-a" style={{ width: "100%" }} onClick={() => { adminSession.set(backup.session); onDone(); }}>
            I've saved them — open dashboard
          </button>
        </div>
      </div>
    );

  return (
    <div className="gate">
      <form className="box" onSubmit={confirm}>
        <div className="brand">RISE ADMIN</div>
        <h2 style={{ marginTop: 16 }}>Set up two-step verification</h2>
        <p className="sub">1. Install Google Authenticator or Authy.<br />2. Scan this code.<br />3. Enter the 6-digit code it shows.</p>
        {error && <div className="msg error">{error}</div>}
        {data && (
          <>
            <img className="qr" src={data.qr} alt="Authenticator QR code" />
            <p style={{ fontSize: 12, color: "#666", wordBreak: "break-all" }}>Can't scan? Enter this key manually: <b>{data.secret}</b></p>
          </>
        )}
        <div className="f" style={{ marginTop: 12 }}><input className="code-in plain" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="000000" required /></div>
        <button className="btn-a" style={{ width: "100%" }} disabled={!data}>Confirm and enable</button>
      </form>
    </div>
  );
}
