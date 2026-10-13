const egp = new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 });

export const formatPrice = (cents: number) => egp.format(cents / 100);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rise-wear.store").replace(/\/$/, "");

export const absoluteUrl = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);
