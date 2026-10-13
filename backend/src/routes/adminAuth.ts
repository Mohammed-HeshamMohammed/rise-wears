import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { one, query } from "../db.js";
import { requireAdminRole, requireAuth, signAdminSession } from "../lib/auth.js";
import { decrypt, encrypt, generateBackupCode, sha256 } from "../lib/crypto.js";
import { HttpError } from "../lib/errors.js";

authenticator.options = { window: 1 };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const adminAuthRouter = Router();
adminAuthRouter.use(
  rateLimit({ windowMs: 15 * 60_000, limit: 40, standardHeaders: true, legacyHeaders: false }),
  requireAuth,
  requireAdminRole,
);

// A code is accepted once: it must belong to a newer 30s step than the last one used.
async function consumeCode(userId: number, secret: string, code: string, lastStep: number): Promise<boolean> {
  const delta = authenticator.checkDelta(code, secret);
  if (delta === null) return false;
  const step = Math.floor(Date.now() / 30_000) + delta;
  if (step <= lastStep) return false;
  const rows = await query("UPDATE users SET totp_last_step = $2 WHERE id = $1 AND totp_last_step < $2 RETURNING id", [userId, step]);
  return rows.length === 1;
}

interface TotpRow {
  totp_last_step: string;
  totp_secret_enc: string | null;
  totp_enabled: boolean;
  totp_failed_attempts: number;
  totp_locked_until: string | null;
  backup_code_hashes: string[];
}

const loadTotp = (userId: number) =>
  one<TotpRow>(
    `SELECT totp_secret_enc, totp_enabled, totp_failed_attempts, totp_locked_until, backup_code_hashes, totp_last_step
     FROM users WHERE id = $1`,
    [userId],
  );

function assertNotLocked(row: TotpRow) {
  if (row.totp_locked_until && new Date(row.totp_locked_until) > new Date()) {
    throw new HttpError(429, "Too many wrong codes. Try again in a few minutes.");
  }
}

async function registerFailure(userId: number, row: TotpRow): Promise<never> {
  const attempts = row.totp_failed_attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await query(
      `UPDATE users SET totp_failed_attempts = 0, totp_locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`,
      [userId, String(LOCK_MINUTES)],
    );
  } else {
    await query("UPDATE users SET totp_failed_attempts = $2 WHERE id = $1", [userId, attempts]);
  }
  throw new HttpError(401, "That code is not correct.");
}

const clearFailures = (userId: number) =>
  query("UPDATE users SET totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = $1", [userId]);

adminAuthRouter.get("/status", async (req, res) => {
  const row = await loadTotp(req.user!.id);
  res.json({ enrolled: !!row?.totp_enabled });
});

adminAuthRouter.post("/setup", async (req, res) => {
  const row = await loadTotp(req.user!.id);
  if (row?.totp_enabled) throw new HttpError(409, "Two-step verification is already set up.");
  const secret = authenticator.generateSecret();
  await query("UPDATE users SET totp_secret_enc = $2 WHERE id = $1", [req.user!.id, encrypt(secret)]);
  const otpauth = authenticator.keyuri(req.user!.email, "RISE Admin", secret);
  res.json({ otpauth, qr: await QRCode.toDataURL(otpauth), secret });
});

adminAuthRouter.post("/setup/confirm", async (req, res) => {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const row = await loadTotp(req.user!.id);
  if (!row?.totp_secret_enc || row.totp_enabled) throw new HttpError(409, "Start setup first.");
  assertNotLocked(row);
  if (!(await consumeCode(req.user!.id, decrypt(row.totp_secret_enc), code, Number(row.totp_last_step)))) {
    await registerFailure(req.user!.id, row);
  }
  const backupCodes = Array.from({ length: 8 }, generateBackupCode);
  await query("UPDATE users SET totp_enabled = TRUE, backup_code_hashes = $2 WHERE id = $1", [
    req.user!.id,
    backupCodes.map(sha256),
  ]);
  await clearFailures(req.user!.id);
  res.json({ session: signAdminSession(req.user!.id), backupCodes });
});

adminAuthRouter.post("/verify", async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(6).max(12) }).parse(req.body);
  const row = await loadTotp(req.user!.id);
  if (!row?.totp_enabled || !row.totp_secret_enc) throw new HttpError(409, "Two-step verification is not set up yet.");
  assertNotLocked(row);

  const normalized = code.replace(/\s|-/g, "").toUpperCase();
  let ok = false;
  if (/^\d{6}$/.test(normalized)) {
    ok = await consumeCode(req.user!.id, decrypt(row.totp_secret_enc), normalized, Number(row.totp_last_step));
  } else {
    const hash = sha256(normalized);
    if (row.backup_code_hashes.includes(hash)) {
      ok = true;
      await query("UPDATE users SET backup_code_hashes = array_remove(backup_code_hashes, $2) WHERE id = $1", [
        req.user!.id, hash,
      ]);
    }
  }
  if (!ok) await registerFailure(req.user!.id, row);
  await clearFailures(req.user!.id);
  res.json({ session: signAdminSession(req.user!.id) });
});
