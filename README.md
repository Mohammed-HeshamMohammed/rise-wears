# RISE store

Full-stack rebuild of [rise-wear.store](https://rise-wear.store): same design, plus customer accounts, order tracking,
an admin dashboard with two-step login, and search/AI-search optimisation.

```
frontend/   Next.js 16 + React 19 + TypeScript   storefront, account area, /admin dashboard
backend/    Node.js + Express + TypeScript       REST API, PostgreSQL (pg), SQL migrations, tests
PLAN.md     Plan, decisions and status
```

## Run it locally

You need Node 20+ (tested on 26). No Docker needed: a local PostgreSQL ships as an npm package.

```bash
# 1. database (leave running)
cd backend && npm install && npm run db:local

# 2. API (new terminal)
cd backend
cp .env.example .env        # then set AUTH_DEV_MODE=true and ADMIN_EMAILS=you@example.com
npm run migrate && npm run seed
npm run dev                 # http://localhost:4000

# 3. site (new terminal)
cd frontend && npm install
cp .env.example .env.local  # set NEXT_PUBLIC_AUTH_DEV_MODE=true for a Firebase-free local login
npm run dev                 # http://localhost:3000
```

`seed` loads what the live store has today: 4 products with their current stock, categories, collections,
the 27 governorate shipping rates, the "buy 2 get 50% off the 3rd" deal, the 4 promo codes and the announcement bar.

Tests (real PostgreSQL, no mocks): `cd backend && npm test`. Type checks: `npm run typecheck` in each folder.
The page stylesheets in `frontend/src/styles/generated` are built from `styles/original` automatically before `dev` and `build`.

## What is where

| Need | Where |
|---|---|
| Customer login (email + Google) | Firebase Authentication. The backend verifies every token. |
| Customer data, orders, products | PostgreSQL. Money is stored as integer piastres. |
| Prices, discounts, shipping, stock | Computed on the **server** at checkout (`backend/src/lib/pricing.ts`). The browser's totals are for display only. |
| Admin dashboard | `/admin`. Needs: a login with the admin role, **and** a 6-digit authenticator code. |
| SEO / AEO | `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, Google Merchant feed (`/feeds/google-merchant.xml`), JSON-LD, canonical URLs, clean URLs and 301s from the old store URLs. |

### Admin two-step login
1. Put the admin's email in `ADMIN_EMAILS` (backend). The email must be **verified** (Google login always is).
2. Open `/admin`, sign in. First time only: scan the QR code with Google Authenticator / Authy and save the 8 backup codes.
3. Every later login asks for the 6-digit code. A code works once. 5 wrong codes lock the account for 15 minutes.
4. Lost phone and backup codes? Reset in the database:
   `UPDATE users SET totp_enabled=false, totp_secret_enc=NULL, backup_code_hashes='{}' WHERE email='...';`

## Emails

Sent from the API over SMTP, styled like the site (`npm run mail:preview` in `backend` writes samples to `backend/.mail-preview/`):

| Email | To |
|---|---|
| Order confirmation | customer |
| New order alert | owner (`OWNER_EMAIL`), reply goes to the customer |
| Confirmed / shipped / delivered / canceled / returned | customer, when the status changes |
| Contact form message | owner, reply goes to the sender |
| Welcome | new newsletter subscriber |

A mail failure is logged and retried twice; it never blocks an order. With `SMTP_HOST` empty (development) nothing is sent.

## Going live

### 1. Firebase (free)
1. [console.firebase.google.com](https://console.firebase.google.com) → create a project.
2. Authentication → Sign-in method → enable **Email/Password** and **Google**.
3. Authentication → Settings → Authorized domains → add `rise-wear.store`.
4. Project settings → Your apps → add a Web app → copy the 4 values into the frontend env (`NEXT_PUBLIC_FIREBASE_*`).
5. Project settings → Service accounts → Generate new private key → paste the JSON **on one line** into backend `FIREBASE_SERVICE_ACCOUNT`.

### 2. Database
Create a free PostgreSQL on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and put the connection string
(with `?sslmode=require`) in backend `DATABASE_URL`. Tables are created on API start (`migrate`). Run `npm run seed` once.

### 3. Email
Hostinger → Emails → create the mailbox `inquiries@rise-wear.store`, then set `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_USER` and `SMTP_PASS` on the API.

### 4. Hosting (Hostinger Business → Node.js apps)
Deploy two Node.js apps from this repo (GitHub import or ZIP):

| App | Root dir | Build | Start | Domain |
|---|---|---|---|---|
| API | `backend` | `npm install && npm run build` | `npm start` | `api.rise-wear.store` |
| Site | `frontend` | `npm install && npm run build` | `npm start` | `rise-wear.store` |

Environment variables are set in hPanel for each app (see `.env.example` in each folder). Production must have
`NODE_ENV=production`, a real `ADMIN_JWT_SECRET` (32+ random chars) and `TOTP_ENCRYPTION_KEY` (64 hex chars), and
**must not** set `AUTH_DEV_MODE` (the API refuses to start if it is on). `CORS_ORIGINS=https://rise-wear.store`,
`REVALIDATE_SECRET` identical on both apps, `REVALIDATE_URL=https://rise-wear.store/api/revalidate`.
`NEXT_PUBLIC_*` values are baked in at build time, so set them **before** building.

Uploaded product images are written to `UPLOAD_DIR` on the API server, so make sure that folder is on persistent storage.
If the Node.js option is not available on the plan, the same code runs on any VPS.

### 5. Search engines and AI
1. **Google Search Console**: add `https://rise-wear.store`, verify (set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` or DNS), submit `https://rise-wear.store/sitemap.xml`.
2. **Bing Webmaster Tools** (also feeds ChatGPT search): import from Search Console, submit the sitemap.
3. **Google Merchant Center**: add the product feed `https://rise-wear.store/feeds/google-merchant.xml` for free product listings.
4. Optional: `NEXT_PUBLIC_GA_ID` for Google Analytics 4.
5. Test a product URL in Google's [Rich Results Test](https://search.google.com/test/rich-results).
6. Keep the old URLs reachable: `/home`, `/product?id=...`, `/shop.html` etc. already 301 to the new URLs.

## Known gaps
- Payment is cash on delivery only, as on the live store.
- The site includes AI-generated hero, collection, About and product model photography based on the existing garment
  references. Original catalog photos are preserved. Assets and generation prompts are documented in `docs/image-prompts.md`.
- Past orders and newsletter subscribers of the old store are not imported (the old site stores them in PHP scripts).
