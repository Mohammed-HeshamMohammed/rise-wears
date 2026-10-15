import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_UPDATED, POLICIES } from "@/lib/policies";
import PageShell from "./PageShell";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export default function LegalPage({ path, title, summary, sections }: { path: string; title: string; summary: string; sections: LegalSection[] }) {
  return (
    <PageShell page="legal">
      <section className="legal-hero">
        <div className="container">
          <span>RISE POLICIES</span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <small>Last updated {LEGAL_UPDATED}</small>
        </div>
      </section>

      <section className="legal-body">
        <div className="container legal-layout">
          <nav className="legal-toc" aria-label="On this page">
            <h2>On this page</h2>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal-content">
            {sections.map((s) => (
              <section id={s.id} key={s.id}>
                <h2>{s.title}</h2>
                {s.body}
              </section>
            ))}
            <aside className="legal-more">
              <h2>Other policies</h2>
              <ul>
                {POLICIES.filter((p) => p.href !== path).map((p) => (
                  <li key={p.href}>
                    <Link href={p.href}>{p.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/contact">Contact us</Link>
                </li>
              </ul>
            </aside>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
