# Going live on an Oracle Cloud Always Free VM

This runs the whole store (website, admin, PostgreSQL, images) on one free Oracle VM, behind Nginx with a free Let's Encrypt HTTPS certificate.

**Recommended VM:** *VM.Standard.A1.Flex* (Ampere ARM), 1–2 OCPU, 6–12 GB RAM, Ubuntu 22.04 or 24.04. The 1 GB AMD micro VM also works (the setup script adds swap), but builds are slow.

---

## 1. Create the VM (Oracle Console)

1. **Compute → Instances → Create instance.** Image: *Canonical Ubuntu 22.04* (or 24.04). Shape: *Ampere A1 Flex*. Add your SSH public key.
2. After it starts, note the **Public IP**. To keep the IP if the VM is recreated: *Networking → IP Management → Reserved public IPs*.
3. **Open ports 80 and 443 in the VCN:** Instance → *Subnet* → *Security List* → **Add Ingress Rules**:
   - Source `0.0.0.0/0`, TCP, destination port `80`
   - Source `0.0.0.0/0`, TCP, destination port `443`

   (The setup script also opens them in the VM's own iptables firewall. Oracle images block them by default, which is the most common "site won't load" cause.)

## 2. Point your domain at the VM

At your domain registrar, create:

| Type | Name | Value |
|---|---|---|
| A | `@` (e.g. nababoutique.in) | VM public IP |
| A | `www` | VM public IP |

Wait until `ping yourdomain.in` shows the VM IP (usually minutes, up to a few hours).

## 3. Copy the code and run setup

From your PC (in `D:\feathers`), commit the code and push it to a **private** GitHub repository, then on the VM:

```bash
ssh ubuntu@<VM-IP>
sudo git clone https://github.com/<you>/feathers.git /opt/feathers
sudo bash /opt/feathers/deploy/setup-server.sh yourdomain.in you@email.com
```

This installs Node 22, PostgreSQL, Nginx and Certbot, creates the database with a random password, generates `AUTH_SECRET`, gets the HTTPS certificate, installs the systemd service and a nightly backup.

## 4. Fill in the settings

```bash
sudo nano /opt/feathers/.env
```

| Setting | What to put |
|---|---|
| `WHATSAPP_NUMBER` | Shop WhatsApp with country code, digits only: `919XXXXXXXXX` |
| `STORE_PHONE`, `STORE_EMAIL`, `STORE_ADDRESS` | Shown in the footer and Contact page |
| `PAYMENT_GATEWAY_KEY` / `PAYMENT_GATEWAY_SECRET` | Razorpay **test** keys first (`rzp_test_…`) — see step 6 |
| `PAYMENT_WEBHOOK_SECRET` | The secret you type when creating the Razorpay webhook |
| `SHIPPING_FLAT`, `FREE_SHIPPING_ABOVE` | Shipping charge and free-shipping threshold (₹) |
| `RESEND_API_KEY` (optional) | For password-reset emails. Without it the reset link is written to `journalctl -u feathers` |

Never commit `.env` and never share it — it holds the database password and payment secret.

## 5. Build, start and create your admin login

```bash
sudo bash /opt/feathers/deploy/deploy.sh
cd /opt/feathers && sudo -u feathers -E bash -c 'set -a; . ./.env; set +a; npm run admin:create -- owner@yourmail.com "Your Name"'
```

The second command prints a one-time password. Sign in at `https://yourdomain.in/admin` and change it under **My Account**.

**Demo products (optional):** `sudo -u feathers -E bash -c 'set -a; . ./.env; set +a; npm run db:seed'` loads the sample catalogue (no demo orders in production). Replace photos and prices in **Products**, or delete them.

## 6. Payments (Razorpay: UPI, cards, net banking, wallets)

1. Create an account at <https://dashboard.razorpay.com> and finish KYC (needed for live mode).
2. **Test mode first:** *Settings → API Keys → Generate Test Key*. Put the key ID and secret in `.env`.
3. *Settings → Webhooks → Add*: URL `https://yourdomain.in/api/payments/webhook`, events **payment.captured**, **payment.failed**, **order.paid**, and a secret (also put it in `PAYMENT_WEBHOOK_SECRET`).
4. *Settings → Payment Capture → Automatic*.
5. `sudo bash /opt/feathers/deploy/deploy.sh`, then place a test order with Razorpay's test UPI ID `success@razorpay` or test card `4111 1111 1111 1111`.
6. When everything works: generate **Live** keys and a live-mode webhook, put them in `.env`, and redeploy.

Orders are marked paid **only** after the server verifies the payment signature and confirms it with Razorpay's API (and again by webhook). Card and UPI details never reach this server.

## 7. Go-live checklist

- [ ] `https://yourdomain.in` loads with a padlock; `http://` redirects to `https://`
- [ ] WhatsApp button opens a chat with the right number
- [ ] Test order with Razorpay test keys → "Order Confirmed!", stock reduced, order in **Admin → Sales**
- [ ] Failed test payment → "Payment Failed" page with Try Again
- [ ] WhatsApp order → appears as Pending → **Record Payment** → Confirmed, stock reduced
- [ ] Switched to Razorpay **live** keys and live webhook
- [ ] Changed the admin password; created cashier accounts under **Staff**
- [ ] Real product photos uploaded; demo products removed or edited
- [ ] Submitted `https://yourdomain.in/sitemap.xml` in Google Search Console
- [ ] Backups: `ls /var/backups/feathers` shows files after the first night; copy them off the server weekly

## Everyday operations

| Task | Command |
|---|---|
| Update after code changes | `cd /opt/feathers && sudo git pull && sudo bash deploy/deploy.sh` |
| App logs | `journalctl -u feathers -f` |
| Restart | `sudo systemctl restart feathers` |
| Manual backup | `sudo /usr/local/bin/feathers-backup` |
| Restore a backup | `pg_restore --clean --no-owner -d "$DATABASE_URL" /var/backups/feathers/db_<date>.dump` |
| Renew HTTPS | automatic (certbot timer); check with `sudo certbot renew --dry-run` |

## Security summary

- HTTPS only (HSTS), strict Content-Security-Policy, no inline secrets in the browser.
- Admin passwords hashed with bcrypt; accounts lock for 15 minutes after 5 wrong passwords; sessions are server-side and revocable.
- All state-changing API calls require same-origin requests (CSRF protection); all input is validated and sanitised on the server.
- Rate limits in Nginx (per IP) and in the app (login, checkout, stitching form, order tracking).
- PostgreSQL listens on localhost only; the app runs as an unprivileged `feathers` user with a hardened systemd unit.
- Customer stitching photos are private (staff-only URLs); product photos are re-encoded on upload, which strips location data.
