import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "About",
  description: "Rise was built for people who believe progress isn't optional. Premium Egyptian-made athletic apparel designed to move with you.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell page="about">
      <section className="about-hero">
        <div className="container">
          <span>OUR STORY</span>
          <h1>RISE ABOVE.</h1>
          <p>Rise was built for people who believe progress isn't optional. Every challenge is another opportunity to become stronger.</p>
        </div>
      </section>

      <section className="about-image">
        <img src="/images/about-banner.jpg" alt="Rise Lifestyle" />
      </section>

      <section className="story">
        <div className="container narrow">
          <h2>WHY WE EXIST</h2>
          <p>Rise was created with one simple belief: growth is earned.</p>
          <p>Every early morning. Every extra rep. Every setback. Every comeback. Progress doesn't happen by chance. It happens because you choose to keep going.</p>
          <p>Our apparel is designed to support that journey — combining premium comfort, performance, and timeless design that moves with you.</p>
          <p>Manufactured entirely in Egypt.</p>
        </div>
      </section>

      <section className="mission">
        <div className="container">
          <h2>OUR VALUES</h2>
          <div className="values">
            <div className="value">
              <i className="fa-solid fa-dumbbell"></i>
              <h3>Performance</h3>
              <p>Built to move. Designed to perform.</p>
            </div>
            <div className="value">
              <i className="fa-solid fa-arrow-trend-up"></i>
              <h3>Progression</h3>
              <p>We believe there is always another level.</p>
            </div>
            <div className="value">
              <i className="fa-solid fa-medal"></i>
              <h3>Quality</h3>
              <p>Premium fabrics. Premium craftsmanship. No shortcuts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-quote">
        <h2>THE ONLY DIRECTION IS UP.</h2>
      </section>

      <section className="about-cta">
        <div className="container">
          <h2>READY TO RISE?</h2>
          <p>Discover apparel built for your journey.</p>
          <Link href="/shop" className="btn btn-dark">
            SHOP COLLECTION
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
