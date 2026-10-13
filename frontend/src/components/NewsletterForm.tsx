"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function NewsletterForm({ placeholder, buttonClass, label }: { placeholder: string; buttonClass?: string; label: string }) {
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") || "");
    setBusy(true);
    try {
      await api("/newsletter", { body: { email } });
      form.reset();
      setStatus({ kind: "success", text: "You're in. Welcome to the movement." });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="newsletter-form" onSubmit={submit}>
        <input type="email" name="email" placeholder={placeholder} required />
        <button type="submit" className={buttonClass} disabled={busy}>
          {label}
        </button>
      </form>
      {status && (
        <p className={`form-status ${status.kind}`} role="status">
          {status.text}
        </p>
      )}
    </>
  );
}
