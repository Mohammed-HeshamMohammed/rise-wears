"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";

export default function ContactForm() {
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string; show: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true);
    try {
      await api("/contact", { body: { name: d.name, email: d.email, subject: d.subject, message: d.message } });
      form.reset();
      setNotice({ kind: "success", text: "Message sent. We'll get back to you within 24–48 business hours.", show: true });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Couldn't send your message.", show: true });
    } finally {
      setBusy(false);
      window.setTimeout(() => setNotice((n) => (n ? { ...n, show: false } : n)), 5000);
    }
  }

  return (
    <>
      <form id="contact-form" onSubmit={submit}>
        <input type="text" name="name" placeholder="Full Name" required />
        <input type="email" name="email" placeholder="Email Address" required />
        <input type="text" name="subject" placeholder="Subject" />
        <textarea name="message" rows={7} placeholder="Your Message" required></textarea>
        <button type="submit" className="btn btn-dark" disabled={busy}>
          {busy ? "SENDING..." : "SEND MESSAGE"}
        </button>
      </form>
      {notice && (
        <div className={`site-notification ${notice.kind}${notice.show ? " show" : ""}`} role="status">
          {notice.text}
        </div>
      )}
    </>
  );
}
