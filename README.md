# NABA Boutique

*“Feathers – The 2nd Skin”*

Online store and back office for NABA Boutique, a ladies fashion and custom stitching boutique.

- **Store:** home, shop with search/filters/sort, product pages (gallery and zoom, size/colour, size chart, share), cart, checkout (Razorpay UPI/cards/net banking/wallets, or WhatsApp order), order confirmation and tracking, wishlist, custom stitching requests with photo upload, and info and policy pages. SEO: canonical URLs, Open Graph, Product/Organization/Breadcrumb JSON-LD, sitemap and robots.
- **Back office (`/admin`):** dashboard; **Catalogue** (products, categories, stock, Excel stock upload); **Buying** (purchases, suppliers); **Selling** (sales and counter POS, returns, customers, stitching requests); **Reports** (sales, profit, stock, purchase, payment, cashier, daily summary); staff with Admin and Cashier roles.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL.

## Run it locally

```bash
npm install
cp .env.example .env            # then set AUTH_SECRET (see the comment in the file)
npm run dev:db                  # terminal 1: local PostgreSQL on port 5440 (no install needed)
npx prisma migrate deploy && npm run db:seed   # terminal 2: schema + demo data
npm run dev                     # http://localhost:3600  ·  admin: /admin
```

`db:seed` writes the demo admin and cashier logins to `TEST-LOGINS.txt` (ignored by git). With `PAYMENT_GATEWAY=mock`, checkout opens a test payment page where you can approve or decline. That test gateway is disabled in production.

## Tests

```bash
npm test            # unit tests (pricing, WhatsApp messages, validation)
npm run test:e2e    # end-to-end against the running dev server: checkout, payment, stock, purchases, Excel, returns, reports, security
```

## How stock works

Stock is never edited directly. Every change goes through `src/server/stock.ts`, a single conditional SQL update that cannot oversell. Each change writes a **StockMovement** row recording the type, quantity, previous and new stock, reference and user. The types are opening stock, purchase, sale, sales return, purchase return, adjustment, Excel import and order cancelled.

| Event | Effect |
|---|---|
| Purchase received | + quantity, moving-average cost updated; new products created |
| Online checkout | Units **reserved** (`stock − reserved` is sellable) for `PAYMENT_HOLD_MINUTES` |
| Payment verified server-side | Reservation becomes a **Sale** (stock −) |
| WhatsApp order | Reserved for `WHATSAPP_HOLD_HOURS`; staff **Record Payment** or confirm → Sale |
| Counter sale | Sale immediately |
| Order cancelled | Reservation released, or sold stock restored (“Order Cancelled”) |
| Sales return | + quantity (unless marked damaged) |
| Excel upload | Opening stock (new products) or add/replace (stock update) |

Expired reservations are released every 5 minutes, and also whenever a checkout or the admin sales page runs.

## Payments

`src/server/payments/` defines a `PaymentProvider` interface with two implementations: **razorpay** and **mock** (development only). To add another gateway, implement the interface and register it in `payments/index.ts`. Keys come only from `PAYMENT_GATEWAY_KEY`, `PAYMENT_GATEWAY_SECRET` and `PAYMENT_WEBHOOK_SECRET`. The server stores only the gateway's order ID, payment ID, method and amount, never card data.

## Project layout

```
prisma/            schema, migrations, seed (+ placeholder artwork generator)
src/app/(store)/   customer pages          src/app/admin/   back office pages
src/app/api/       JSON API (public + /api/admin, staff-only)
src/server/        database services: stock, orders, purchases, excel, reports, payments, auth
src/lib/           shared helpers: pricing, WhatsApp messages, validation, formatting
src/components/    store/ and admin/ UI
deploy/            Oracle VM setup, Nginx, systemd, deploy and backup scripts
```

Deployment: see **[docs/DEPLOYMENT-ORACLE.md](docs/DEPLOYMENT-ORACLE.md)**.

Ready for later: coupons (`Coupon` table), product reviews (`Review` table, shown when approved), customer accounts (customers are already stored by phone), GST invoices, more payment gateways, the WhatsApp Business API (message builders in `src/lib/whatsapp.ts`) and a shipping API (courier and tracking number fields on orders).
