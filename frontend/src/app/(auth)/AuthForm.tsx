"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { devAuth, firebaseConfigured } from "@/lib/firebase";

function Form({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const { user, loading, available, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(target);
  }, [loading, user, router, target]);

  async function run(fn: () => Promise<void>, goto = true) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (goto) router.replace(target);
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    return run(() => (mode === "login" ? signIn(email, password) : signUp(name, email, password)));
  };

  const login = mode === "login";
  return (
    <div className="auth-card">
      <h1>{login ? "WELCOME BACK." : "JOIN RISE."}</h1>
      <p className="sub">{login ? "Log in to track your orders and manage your profile." : "Create an account to track orders and check out faster."}</p>

      {!available && (
        <div className="notice error">Login isn't set up on this site yet. Add the Firebase settings in the environment file (see README).</div>
      )}
      {devAuth && !firebaseConfigured && <div className="notice">Local development login: any email works, no password is checked.</div>}
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}

      <form onSubmit={submit}>
        {!login && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!(devAuth && !firebaseConfigured)} minLength={devAuth && !firebaseConfigured ? 0 : 6} autoComplete={login ? "current-password" : "new-password"} />
        </div>
        <button className="auth-btn" disabled={busy || !available}>
          {busy ? "PLEASE WAIT..." : login ? "LOG IN" : "CREATE ACCOUNT"}
        </button>
      </form>

      {firebaseConfigured && (
        <>
          <div className="auth-divider">or</div>
          <button className="auth-btn ghost" disabled={busy} onClick={() => run(signInWithGoogle)}>
            CONTINUE WITH GOOGLE
          </button>
        </>
      )}

      <div className="auth-links">
        {login ? (
          <>
            <span>
              New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
            </span>
            {firebaseConfigured && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!email) return setMsg({ kind: "error", text: "Type your email above first." });
                  run(async () => {
                    await resetPassword(email);
                    setMsg({ kind: "success", text: "Password reset email sent. Check your inbox." });
                  }, false);
                }}
              >
                Forgot password?
              </a>
            )}
          </>
        ) : (
          <span>
            Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
          </span>
        )}
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <section className="auth-page">
      <div className="container">
        <Suspense fallback={null}>
          <Form mode={mode} />
        </Suspense>
      </div>
    </section>
  );
}
