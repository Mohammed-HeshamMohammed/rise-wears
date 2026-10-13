"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo, { LOGO_VIEWBOX } from "./BrandLogo";

const FLY_MS = 800;
const LETTERS_AT_MS = 520;
const DRIFT_AT_MS = 950;
const DRIFT_MS = 1500;
const LAND_MS = 800;

/**
 * Home-page intro: the arrow shoots up from below the screen, RISE climbs in, the arrow drifts around,
 * then the whole logo flies into its place in the header. It plays once per browser session.
 * The overlay is part of the server HTML (so there is no flash of page); CSS fails safe if scripts never run.
 */
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
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = document.querySelector<SVGElement>("#header .brand-logo");
    if (!el || !target || root.classList.contains("no-intro") || reduced) return finish();

    const logo = el.querySelector<SVGElement>(".brand-logo")!;
    const arrow = el.querySelector<SVGElement>(".brand-logo-arrow")!;
    const drift = el.querySelector<SVGElement>(".brand-logo-drift")!;
    const letters = [...el.querySelectorAll<SVGElement>(".brand-logo-letter")];
    const running: Animation[] = [];
    const play = (node: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const a = node.animate(keyframes, { fill: "both", ...options });
      running.push(a);
      return a;
    };

    let cancelled = false;
    (async () => {
      try {
        for (let frame = 0; frame < 120 && logo.getBoundingClientRect().height === 0; frame++) {
          await new Promise(requestAnimationFrame);
        }
        if (cancelled || logo.getBoundingClientRect().height === 0) return;
        // SVG transforms are in user units, so convert screen pixels to the logo's own units.
        const unit = logo.getBoundingClientRect().height / LOGO_VIEWBOX.height;
        const below = (innerHeight - logo.getBoundingClientRect().top) / unit + 120;

        play(arrow, [
          { transform: `translateY(${below}px) scaleY(1.45)`, filter: "blur(6px)", offset: 0 },
          { transform: "translateY(-34px) scaleY(1)", filter: "blur(0px)", offset: 0.78, easing: "ease-out" },
          { transform: "translateY(0)", offset: 1 },
        ], { duration: FLY_MS, easing: "cubic-bezier(.05,.8,.1,1)" });

        letters.forEach((letter, i) =>
          play(letter, [{ transform: "translateY(110px)" }, { transform: "translateY(0)" }], {
            duration: 650,
            delay: LETTERS_AT_MS + i * 90,
            easing: "cubic-bezier(.16,.9,.25,1)",
          }),
        );

        const wander = (x: number, y: number, deg: number) => ({ transform: `translate(${x}px, ${y}px) rotate(${deg}deg)`, easing: "ease-in-out" });
        const wobble = play(drift, [wander(0, 0, 0), wander(-48, -22, -6), wander(44, -36, 5), wander(-32, 16, -4), wander(16, -8, 2), wander(0, 0, 0)], {
          duration: DRIFT_MS,
          delay: DRIFT_AT_MS,
        });
        await wobble.finished;

        const from = logo.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const scale = to.height / from.height;
        play(el.parentElement!, [{ backgroundColor: "rgba(255,255,255,1)" }, { backgroundColor: "rgba(255,255,255,0)" }], { duration: LAND_MS * 0.8 });
        await play(logo, [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], {
          duration: LAND_MS,
          easing: "cubic-bezier(.65,0,.25,1)",
        }).finished;
      } catch {
        // animation was cancelled: fall through
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
        <BrandLogo className="intro-logo" clipArrow={false} />
      </div>
    </div>
  );
}
