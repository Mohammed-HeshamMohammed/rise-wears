"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

const ARROW = "M363 0 L725 609 L363 352 L1 609 Z";
// Horizontal extent of R, I, S, E inside logo.png (726x756).
const LETTERS: [number, number][] = [[174, 254], [300, 319], [364, 445], [490, 565]];

// The intro plays on a full page load only; client-side navigations remount the header without replaying it.
let introPlayed = false;

export default function BrandLogo() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [intro] = useState(() => typeof window === "undefined" || !introPlayed);
  useEffect(() => {
    introPlayed = true;
  }, []);

  return (
    <svg viewBox="-12 -12 750 780" className={`brand-logo${intro ? " intro" : ""}`} role="img" aria-label="RISE">
      <defs>
        <clipPath id={`${id}-horizon`}>
          <rect x="-20" y="-60" width="770" height="676" />
        </clipPath>
        {LETTERS.map(([a, b], i) => (
          <clipPath id={`${id}-l${i}`} key={i}>
            <rect x={a - 6} y="660" width={b - a + 12} height="100" />
          </clipPath>
        ))}
      </defs>
      <g clipPath={`url(#${id}-horizon)`}>
        <g className="brand-logo-lift">
          <path className="brand-logo-arrow" d={ARROW} fill="#111" pathLength={1} />
        </g>
      </g>
      {LETTERS.map((_, i) => (
        <g clipPath={`url(#${id}-l${i})`} key={i}>
          <image className="brand-logo-letter" style={{ "--i": i } as CSSProperties} href="/images/logo.png" width="726" height="756" />
        </g>
      ))}
    </svg>
  );
}
