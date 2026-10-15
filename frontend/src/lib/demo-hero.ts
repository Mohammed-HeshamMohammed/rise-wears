import type { Hero } from "./hero";

const HERO_KEY = "rise-demo-hero";

export function demoHero(): Hero | null {
  try {
    const raw = localStorage.getItem(HERO_KEY);
    return raw ? (JSON.parse(raw) as Hero) : null;
  } catch {
    return null;
  }
}

export function saveDemoHero(hero: Hero | null): boolean {
  try {
    if (hero) localStorage.setItem(HERO_KEY, JSON.stringify(hero));
    else localStorage.removeItem(HERO_KEY);
    return true;
  } catch {
    return false;
  }
}
