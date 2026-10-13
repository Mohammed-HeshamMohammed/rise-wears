import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://rise:rise@localhost:54330/rise",
      AUTH_DEV_MODE: "true",
      ADMIN_JWT_SECRET: "test-secret-test-secret-test-secret-1234",
      TOTP_ENCRYPTION_KEY: "11".repeat(32),
      ADMIN_EMAILS: "admin@rise.test",
      UPLOAD_DIR: ".test-uploads",
      CORS_ORIGINS: "http://localhost:3000",
    },
  },
});
