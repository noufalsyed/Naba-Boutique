# Going live free on Netlify + Neon

The website and admin run on **Netlify** (free plan, commercial use allowed), the database on **Neon** (free PostgreSQL), and product / stitching photos in **Netlify Blobs**, which is included with Netlify. Every `git push` to GitHub publishes the new version automatically. No server to manage, no card needed.

**Free plan limits to know**

- **Wake-up delay:** Neon sleeps after a few minutes without visitors. The next page takes 1–3 seconds longer to load.
- **Monthly allowance:** Netlify's free plan has a monthly usage allowance. If a very busy month uses it up, the site pauses until the next month. Check *Netlify → Usage* now and then.
- **Database size:** Neon's free plan holds 0.5 GB, enough for many thousands of orders.
- **Excel imports:** each request has a short time limit. Upload very large stock sheets in parts of about 200 rows.

---

## 1. Put the code on GitHub

1. github.com → **New repository** → name `naba-boutique`, **Private**, no README → **Create**.
2. In `D:\feathers`:

```bash
git remote add origin https://github.com/<your-username>/naba-boutique.git
```

```bash
git push -u origin master
```

`.env`, test logins, the local database and local photos are never uploaded (`.gitignore`).

## 2. Create the database (Neon)

1. Sign up at **neon.tech** (you can use *Continue with GitHub*).
2. **Create project:**
   - **Name:** `naba-boutique`
   - **PostgreSQL version:** 17
   - **Region:** **AWS US East 2 (Ohio)**. This is the same region as Netlify's servers, which keeps the site fast.
3. On the project dashboard, click **Connect**. You need two addresses:
   - **Connection pooling ON:** the host contains `-pooler`. This is your **`DATABASE_URL`**.
   - **Connection pooling OFF:** this is your **`DIRECT_URL`**.

   Both look like `postgresql://neondb_owner:…@ep-…aws.neon.tech/neondb?sslmode=require`. Keep them private.

## 3. Create the site (Netlify)

1. Sign up at **netlify.com** with *GitHub*.
2. **Add new project → Import an existing project → GitHub** → allow access to the `naba-boutique` repository → select it.
3. Netlify reads the build settings from `netlify.toml`, so don't change them. Before the first deploy, open **Environment variables → Add variables** (or after creating: *Project configuration → Environment variables*) and add these:

| Key | Value |
|---|---|
| `PLATFORM` | `netlify` |
| `DATABASE_URL` | the **pooled** Neon address |
| `DIRECT_URL` | the **direct** Neon address |
| `AUTH_SECRET` | a random string (see below) |
| `CRON_SECRET` | another random string |
| `APP_URL` | `https://<your-site>.netlify.app` (later your own domain) |
| `SESSION_HOURS` | `12` |
| `WHATSAPP_NUMBER` | `91` + your 10-digit WhatsApp number, digits only |
| `WHATSAPP_BUSINESS_NAME` | `NABA Boutique` |
| `STORE_PHONE`, `STORE_EMAIL`, `STORE_ADDRESS` | shown in the footer and Contact page |
| `INSTAGRAM_URL` | `https://www.instagram.com/feathers_the_2ndskin_/` |
| `SHIPPING_FLAT` / `FREE_SHIPPING_ABOVE` | e.g. `79` / `1499` |
| `ESTIMATED_DELIVERY` | `3–7 working days across India` |
| `PAYMENT_GATEWAY` | `razorpay` |
| `PAYMENT_GATEWAY_KEY` / `PAYMENT_GATEWAY_SECRET` | Razorpay test keys first (step 6) |
| `PAYMENT_WEBHOOK_SECRET` | the Razorpay webhook secret (step 6) |
| `PAYMENT_HOLD_MINUTES` / `WHATSAPP_HOLD_HOURS` | `30` / `24` |
| `RESEND_API_KEY`, `MAIL_FROM` | optional, for password-reset emails |

Make a random string for `AUTH_SECRET` and `CRON_SECRET` (run it twice, use a different one for each):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Do **not** add `NODE_ENV`; Netlify sets it itself.

4. **Deploy.** The first build takes 3–5 minutes. It also creates the database tables. When it shows **Published**, open the `…netlify.app` link.

If you add or change variables later, redeploy: **Deploys → Trigger deploy → Deploy project**.

## 4. Create your admin login

In a terminal in `D:\feathers` on your PC (PowerShell), with the **pooled** Neon address:

```powershell
$env:DATABASE_URL="<pooled Neon address>"; npm run admin:create -- you@email.com "Your Name"
```

It prints a one-time password. Sign in at `https://<your-site>.netlify.app/admin` and change it under **My Account**. Add cashiers under **Staff**.

**Close that terminal window afterwards.** While it stays open, its commands point at the live database.

### Demo products (optional)

To load the sample catalogue into the live site, you need two more values:

- **Site ID:** Netlify → *Project configuration → General → Project details*.
- **Personal access token:** Netlify → your avatar → *User settings → Applications → Personal access tokens → New access token*.

Then, in a **new** terminal:

```powershell
$env:DATABASE_URL="<pooled Neon address>"; $env:NODE_ENV="production"; $env:STORAGE_DRIVER="netlify"; $env:NETLIFY_SITE_ID="<site id>"; $env:NETLIFY_AUTH_TOKEN="<token>"; npm run db:seed
```

Close the terminal and delete the token in Netlify afterwards. Replace the demo photos and prices in **Products**, or delete the products.

## 5. Your own domain (optional)

Netlify → *Domain management → Add a domain* → enter `nababoutique.in` → follow the DNS records Netlify shows at your domain registrar. HTTPS is set up automatically. Then change `APP_URL` to `https://nababoutique.in` and redeploy.

## 6. Payments (Razorpay)

1. Create an account at **dashboard.razorpay.com** and finish KYC.
2. *Settings → API Keys → Generate Test Key* → put them in `PAYMENT_GATEWAY_KEY` / `PAYMENT_GATEWAY_SECRET`.
3. *Settings → Webhooks → Add*: URL `https://<your-domain>/api/payments/webhook`, events **payment.captured**, **payment.failed**, **order.paid**, and a secret → also in `PAYMENT_WEBHOOK_SECRET`.
4. Redeploy, then place a test order with UPI ID `success@razorpay` or card `4111 1111 1111 1111`.
5. When it works, switch to **Live** keys and a live-mode webhook, and redeploy.

## 7. Nightly database backup (free, via GitHub)

GitHub → your repository → *Settings → Secrets and variables → Actions → New repository secret*: name `NEON_DIRECT_URL`, value = the **direct** Neon address.

The *Database backup* workflow (`.github/workflows/backup.yml`) then runs every night at 03:00 IST and keeps each backup for 30 days (*Actions → Database backup → a run → Artifacts*). Run it once now with **Run workflow** to check it works.

Product photos live in Netlify Blobs and are not part of this backup. Keep your original photos on your PC or phone.

## Everyday use

| Task | How |
|---|---|
| Publish code changes | `git push`. Netlify rebuilds and publishes automatically. |
| See errors | Netlify → *Logs → Functions* |
| Stock holds of unpaid orders | Released every 5 minutes by the scheduled function `maintenance` (Netlify → *Logs → Functions*) |
| Undo a bad release | Netlify → *Deploys* → an older deploy → **Publish deploy** |

## Go-live checklist

- [ ] Site opens with a padlock; WhatsApp button opens the right number
- [ ] Test order with Razorpay test keys → "Order Confirmed!", stock reduced, order in **Admin → Sales**
- [ ] Failed test payment → "Payment Failed" page with Try Again
- [ ] WhatsApp order → Pending → **Record Payment** → Confirmed
- [ ] Product photo upload works in **Admin → Products**
- [ ] Switched to Razorpay **live** keys and webhook
- [ ] Changed the admin password; demo products replaced
- [ ] Backup workflow ran once successfully
- [ ] Submitted `https://<your-domain>/sitemap.xml` in Google Search Console
