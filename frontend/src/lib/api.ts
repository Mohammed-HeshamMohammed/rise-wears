import type { Announcement, Product } from "./types";

const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const BASE = typeof window === "undefined" ? (process.env.API_URL || PUBLIC_API).replace(/\/$/, "") : PUBLIC_API;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter = async () => null;
export const setTokenGetter = (fn: TokenGetter) => {
  tokenGetter = fn;
};

const ADMIN_SESSION_KEY = "rise-admin-session";
export const adminSession = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY);
    } catch {
      return null;
    }
  },
  set: (v: string) => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, v);
    } catch {}
  },
  clear: () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  },
};

interface Opts {
  method?: string;
  body?: unknown;
  auth?: boolean;
  admin?: boolean;
  raw?: { data: Blob; type: string };
  revalidate?: number;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.raw) headers["Content-Type"] = opts.raw.type;
  if (opts.auth || opts.admin) {
    const t = await tokenGetter();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  if (opts.admin) {
    const s = adminSession.get();
    if (s) headers["X-Admin-Session"] = s;
  }
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: opts.method ?? (opts.body !== undefined || opts.raw ? "POST" : "GET"),
    headers,
    body: opts.raw ? opts.raw.data : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };
  if (typeof window === "undefined") {
    if (opts.revalidate !== undefined) init.next = { revalidate: opts.revalidate };
    else init.cache = "no-store";
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, init);
  } catch {
    throw new ApiError(0, "Can't reach the server. Please try again.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (opts.admin && res.status === 401 && typeof window !== "undefined") {
      adminSession.clear();
      window.dispatchEvent(new Event("rise-admin-expired"));
    }
    throw new ApiError(res.status, data?.error || "Something went wrong.");
  }
  return data as T;
}

// Page helpers return empty data instead of throwing, so a down API doesn't take pages down.
export async function getProducts(query = ""): Promise<Product[]> {
  try {
    return await api<Product[]>(`/products${query}`, { revalidate: 60 });
  } catch {
    return [];
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await api<Product>(`/products/${encodeURIComponent(slug)}`, { revalidate: 60 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    return await api<Announcement[]>("/announcements", { revalidate: 60 });
  } catch {
    return [];
  }
}
