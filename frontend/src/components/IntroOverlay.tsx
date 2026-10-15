"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";

const HOLD_MS = 300;
const LAND_MS = 800;

// Home-page intro: the logo traces itself full screen, then flies into its place in the header as the page appears.
// Plays once per browser session. The overlay is part of the server HTML so there is no flash of page,
// and intro.css removes it on its own if scripts never run.
export default function IntroOverlay() {
  const [done, setDone] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const finish = () => {
      try {
        sessionStorage.setItem("rise-intro", "1");
      } catch {}
      root.classList.add("intro-done");
      setDone(true);
    };
    const el = stage.current;
    const target = document.querySelector<SVGElement>("#header .brand-logo");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || !target || root.classList.contains("no-intro") || reduced) return finish();

    const logo = el.querySelector<SVGElement>(".brand-logo")!;
    let cancelled = false;
    const running: Animation[] = [];

    (async () => {
      try {
        await Promise.all(logo.getAnimations({ subtree: true }).map((a) => a.finished));
        await new Promise((r) => setTimeout(r, HOLD_MS));
        if (cancelled) return;

        const from = logo.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = to.height / from.height;

        const fade = el.parentElement!.animate([{ backgroundColor: "rgba(255,255,255,1)" }, { backgroundColor: "rgba(255,255,255,0)" }], {
          duration: LAND_MS * 0.8,
          fill: "both",
        });
        const fly = logo.animate([{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], {
          duration: LAND_MS,
          easing: "cubic-bezier(.65,0,.25,1)",
          fill: "both",
        });
        running.push(fade, fly);
        await fly.finished;
      } catch {
        // cancelled: fall through
      } finally {
        if (!cancelled) finish();
      }
    })();

    return () => {
      cancelled = true;
      running.forEach((a) => a.cancel());
    };
  }, []);

  if (done) return null;
  return (
    <div className="intro-overlay" aria-hidden="true">
      <div className="intro-stage" ref={stage}>
        <BrandLogo className="intro-logo play" />
      </div>
    </div>
  );
}
