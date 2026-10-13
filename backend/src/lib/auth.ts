import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "../config.js";
import { one } from "../db.js";
import { HttpError } from "./errors.js";

export interface AppUser {
  id: number;
  firebase_uid: string;
  email: string;
  name: string;
  mobile: string;
  role: "customer" | "admin";
  totp_enabled: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AppUser;
  }
}

interface Identity {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

function firebaseAuth() {
  if (!getApps().length) {
    if (!config.FIREBASE_SERVICE_ACCOUNT) throw new HttpError(503, "Authentication is not configured");
    initializeApp({ credential: cert(JSON.parse(config.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getAuth();
}

async function verifyToken(token: string): Promise<Identity> {
  if (config.AUTH_DEV_MODE && config.NODE_ENV !== "production" && token.startsWith("dev:")) {
    const [, uid, email] = token.split(":");
    if (!uid || !email) throw new HttpError(401, "Bad dev token");
    return { uid, email, name: email.split("@")[0]!, emailVerified: true };
  }
  try {
    const d = await firebaseAuth().verifyIdToken(token);
    return { uid: d.uid, email: d.email ?? "", name: d.name ?? "", emailVerified: d.email_verified === true };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, "Invalid or expired login");
  }
}

async function loadUser(id: Identity): Promise<AppUser> {
  // Admin is granted only by the ADMIN_EMAILS allow-list AND a verified email,
  // so nobody can claim an admin address by signing up with it unverified.
  const isAdminEmail = id.emailVerified && config.adminEmails.includes(id.email.toLowerCase());
  const row = await one<AppUser>(
    `INSERT INTO users (firebase_uid, email, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email,
           role = CASE WHEN $5 THEN 'admin' ELSE users.role END
     RETURNING id, firebase_uid, email, name, mobile, role, totp_enabled`,
    [id.uid, id.email, id.name, isAdminEmail ? "admin" : "customer", isAdminEmail],
  );
  // Attach earlier guest orders placed with the same email - only once the email is verified,
  // so nobody can claim someone else's orders by signing up with their address.
  if (id.emailVerified && id.email) {
    await one("UPDATE orders SET user_id = $1 WHERE user_id IS NULL AND lower(email) = lower($2)", [row!.id, id.email]);
  }
  return row!;
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  return h?.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = bearer(req);
    if (token) req.user = await loadUser(await verifyToken(token));
    next();
  } catch (e) {
    next(e);
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = bearer(req);
    if (!token) throw new HttpError(401, "Please log in");
    req.user = await loadUser(await verifyToken(token));
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAdminRole(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") return next(new HttpError(403, "Admin access only"));
  next();
}

export function signAdminSession(userId: number): string {
  return jwt.sign({ sub: String(userId), mfa: true }, config.ADMIN_JWT_SECRET, {
    expiresIn: "4h",
    issuer: "rise-admin",
  });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.user?.role !== "admin") return next(new HttpError(403, "Admin access only"));
    const session = req.headers["x-admin-session"];
    if (typeof session !== "string") return next(new HttpError(401, "Two-step verification required"));
    try {
      const p = jwt.verify(session, config.ADMIN_JWT_SECRET, { issuer: "rise-admin" }) as jwt.JwtPayload;
      if (p.sub !== String(req.user.id) || p.mfa !== true) throw new Error("mismatch");
    } catch {
      return next(new HttpError(401, "Two-step session expired"));
    }
    next();
  });
}
