# RISE Store Rebuild Plan

Rebuild of `https://rise-wear.store` as a full-stack project. The design is copied exactly from the live store; the work is
everything behind it: accounts, orders, an admin dashboard with two-step login, and SEO/AEO.
Setup and deployment steps are in [README.md](README.md).

## Status (2026-10-13)

| # | Requirement | Status |
|---|---|---|
| 1 | Login with email/password and Google (Firebase Auth) | Built. Needs the owner's Firebase project keys to go live. Local dev login works without Firebase. |
| 2 | Customers check out their orders | Built: order list, status filter, order detail with timeline, cancel while pending. Guest orders attach to the account by verified email. |
| 3 | SEO / AEO / XML | Built: sitemap.xml (with images), robots.txt allowing search + AI crawlers, llms.txt, llms-full.txt, Google Merchant XML feed, JSON-LD (Organization, WebSite, ItemList, Product, Offer, BreadcrumbList, FAQPage), canonical + Open Graph, 301s from old URLs. Search Console / Bing / Merchant Center registration is a go-live step. |
| 4 | Admin dashboard with 2-step auth | Built: products (images, sizes, stock, visibility, featured), categories, collections, deals, promo codes, announcement bar, shipping rates, orders + status, customers, subscribers, messages. Login + admin role + authenticator code on every session; changes appear on the site immediately. |
| 5 | Profile and order lists (Canceled, Delivered…) | Built: profile, saved addresses, orders by status. |
| - | Design copied from current store | Built: original CSS reused, scoped per page so every page renders like the original. |
| - | Server-side prices | Built. Fixes the old store where totals and promo codes were decided in the browser. |

Verified: 36 automated tests against a real PostgreSQL (pricing rules, stock, accounts, 2-step login incl. lockout and
code replay, admin actions, uploads), production build of both apps, and a browser click-through
(browse → cart → checkout → order → login → account → admin enrolment → dashboard edit → storefront update).
**Not verified yet:** real Firebase login (no Firebase project exists yet) and deployment on Hostinger.

## Decisions

- **Next.js** (React + TSX) so pages are server-rendered; several AI crawlers do not run JavaScript.
- **Firebase Authentication** for customer login (the user said "Firestore"; Firestore is Firebase's database, the login product is Authentication). Store data lives in PostgreSQL, Firebase holds identity only.
- **Admin 2-step login is built into the backend (TOTP)** rather than Firebase multi-factor, because Firebase's needs a paid billing plan. Works with Google Authenticator/Authy. 8 single-use backup codes, 5-attempt lockout, secrets encrypted at rest, a used code can't be reused.
- **`pg` + plain SQL migrations instead of Prisma.** Prisma's CLI and client were out of step at build time; plain SQL is simpler and has no tooling risk.
- **Cash on delivery only, English only, EGP**, as the live store.
- **Hosting:** Hostinger Business plan (Node.js apps) for the site and API, free PostgreSQL on Neon or Supabase (Hostinger shared hosting has MySQL only). To be confirmed on the account; fallback is a VPS.

## Current store (inspected 2026-10-13)

| Area | Today |
|---|---|
| Platform | Hand-built static HTML/CSS/JS on Hostinger with PHP scripts (stock, contact, newsletter) |
| Catalogue | 4 products in `js/products.js`, sizes S–XL, categories Tops and Pants, collections Drop 001/002 |
| Shipping | 100 / 120 / 150 EGP by governorate (27 governorates) |
| Offers | "Buy 2 get 50% off the 3rd" (automatic) + 4 promo codes; they never combine |

Issues found and fixed in the rebuild: prices/discounts calculated in the browser; no `robots.txt`/`sitemap.xml`;
no structured data; `?id=` product URLs; the checkout form value "Sharkia" did not match the shipping list ("Sharqia"),
so those orders got 0 shipping.

## Architecture

```
frontend/  Next.js + TypeScript   storefront, /account, /admin
backend/   Express + TypeScript   REST API  →  PostgreSQL
Firebase Auth issues login tokens; the backend verifies them on every request.
```

- **Database:** users, addresses, categories, collections, products, product_images, product_variants (size + stock),
  deals, deal_products, promo_codes, shipping_rates, announcements, orders, order_items, order_status_history,
  newsletter_subscribers, contact_messages. Money in piastres.
- **Order statuses:** pending → confirmed → shipped → delivered; canceled and returned. Canceling returns stock.
  Canceled/returned are final.
- **Security:** server-side pricing; stock decremented inside the order transaction with row locks; rate limits on
  orders, promo checks and 2-step attempts; admin role only for verified emails on the allow-list; uploads checked by
  file signature; Helmet headers; the API refuses to start in production with dev login on or default secrets.

## Not done / next

1. Firebase project + production env values (owner).
2. Deploy to Hostinger and point DNS; first test is a Node.js app on the plan.
3. Order emails (customer confirmation, owner alert). Needs an email provider.
4. Import past orders and subscribers from the old PHP storage, if wanted.
5. Search Console, Bing Webmaster, Merchant Center registration after launch.
6. Optional: online payments (Paymob), Arabic/RTL.
