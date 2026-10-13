import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PageShell from "@/components/PageShell";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about your RISE order, sizing or collaborations? Contact us at inquiries@rise-wear.store. We reply within 24–48 business hours.",
  alternates: { canonical: "/contact" },
};

const FAQ = [
  { q: "How long does shipping take?", a: "Shipping times vary depending on your location. Tracking information will be sent once your order ships." },
  { q: "Can I exchange sizes?", a: "Yes. Contact us within 7 days of receiving your order and we'll help arrange an exchange." },
  { q: "Do you ship internationally?", a: "Coming soon!" },
];

export default function ContactPage() {
  return (
    <PageShell page="contact">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <section className="contact-hero">
        <div className="container">
          <h1>CONTACT</h1>
          <p>Questions about your order, sizing, collaborations, or anything else? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="contact-section">
        <div className="container contact-grid">
          <div className="contact-form">
            <h2>Send a Message</h2>
            <ContactForm />
          </div>
          <div className="contact-info">
            <h2>Contact Information</h2>
            <div className="info-item">
              <i className="fa-solid fa-envelope"></i>
              <div>
                <h3>Email</h3>
                <p>inquiries@rise-wear.store</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fa-brands fa-instagram"></i>
              <div>
                <h3>Instagram</h3>
                <p>@risewear.eg</p>
              </div>
            </div>
            <div className="info-item">
              <i className="fa-regular fa-clock"></i>
              <div>
                <h3>Response Time</h3>
                <p>Within 24–48 Business Hours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          {FAQ.map((f) => (
            <div className="faq-item" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="contact-quote">
        <h2>RISE ABOVE.</h2>
      </section>
    </PageShell>
  );
}
