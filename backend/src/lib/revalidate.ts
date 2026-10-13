import { config } from "../config.js";

let timer: NodeJS.Timeout | undefined;

/**
 * Tells the storefront to drop its cached pages (debounced, fire-and-forget).
 * Without this, dashboard edits would show up after the page cache expires (up to 60s).
 */
export function notifyStorefront() {
  if (!config.REVALIDATE_URL || !config.REVALIDATE_SECRET) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch(config.REVALIDATE_URL, { method: "POST", headers: { "x-revalidate-secret": config.REVALIDATE_SECRET } }).catch((e) =>
      console.warn("storefront revalidate failed:", e.message),
    );
  }, 300);
}
