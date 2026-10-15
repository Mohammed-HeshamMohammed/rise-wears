"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { demoHero } from "@/lib/demo-hero";
import type { Hero } from "@/lib/hero";

export default function HeroSection({ hero, offline }: { hero: Hero; offline: boolean }) {
  const [h, setH] = useState(hero);
  useEffect(() => {
    if (!offline) return;
    const saved = demoHero();
    if (saved) setH(saved);
  }, [offline]);

  const vars = {
    "--hero-img": `url("${h.imageUrl}")`,
    "--hero-img-m": `url("${h.mobileImageUrl || h.imageUrl}")`,
    "--hero-dim": h.dim / 100,
  } as CSSProperties;

  return (
    <section className={`hero hero--${h.style}`} style={vars}>
      <div className="hero-media" role="img" aria-label="" />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1>{h.title}</h1>
        {h.slogan && <p className="hero-slogan">{h.slogan}</p>}
        {h.description && <p className="hero-description">{h.description}</p>}
        <Link href={h.buttonLink} className={`btn ${h.style === "split" ? "btn-dark" : "btn-light"}`}>
          {h.buttonText}
        </Link>
      </div>
    </section>
  );
}
