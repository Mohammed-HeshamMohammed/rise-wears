import { z } from "zod";

try {
  // Node >= 20.12. On hosts without it, env vars must come from the platform panel.
  (process as unknown as { loadEnvFile?: () => void }).loadEnvFile?.();
} catch {
  /* no .env file - fine */
}

const bool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional().default(""),
  AUTH_DEV_MODE: bool,
  ADMIN_JWT_SECRET: z.string().min(32),
  TOTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars"),
  ADMIN_EMAILS: z.string().optional().default(""),
  UPLOAD_DIR: z.string().default("uploads"),
  PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  // Optional: the storefront's refresh endpoint, so dashboard changes show up immediately.
  REVALIDATE_URL: z.string().optional().default(""),
  REVALIDATE_SECRET: z.string().optional().default(""),
});

export const config = (() => {
  const c = schema.parse(process.env);
  if (c.NODE_ENV === "production") {
    const problems: string[] = [];
    if (c.AUTH_DEV_MODE) problems.push("AUTH_DEV_MODE must be false in production");
    if (!c.FIREBASE_SERVICE_ACCOUNT) problems.push("FIREBASE_SERVICE_ACCOUNT is required");
    if (c.ADMIN_JWT_SECRET.startsWith("change-me")) problems.push("ADMIN_JWT_SECRET must be changed");
    if (/^0+$/.test(c.TOTP_ENCRYPTION_KEY)) problems.push("TOTP_ENCRYPTION_KEY must be changed");
    if (problems.length) throw new Error("Unsafe production config: " + problems.join("; "));
  }
  return {
    ...c,
    corsOrigins: c.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    adminEmails: c.ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  };
})();
