#!/usr/bin/env bash
# One-time setup of an Ubuntu 22.04 / 24.04 server: Oracle Cloud Always Free (Ampere ARM or AMD),
# Google Cloud free e2-micro, or any VPS.
# Installs Node.js 22, PostgreSQL, Nginx and Certbot, opens ports 80/443, creates
# the database, a 'feathers' system user and a swap file.
#
#   sudo bash deploy/setup-server.sh shop.example.com you@example.com
set -euo pipefail

DOMAIN="${1:?Usage: setup-server.sh <domain> <email-for-ssl>}"
EMAIL="${2:?Usage: setup-server.sh <domain> <email-for-ssl>}"
APP_DIR=/opt/feathers
DB_NAME=feathers
DB_USER=feathers

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo"; exit 1; }

echo "==> Packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx postgresql postgresql-contrib iptables-persistent unattended-upgrades
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Swap (the 1 GB AMD free VM needs it to build)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: Oracle Ubuntu images REJECT everything except SSH in iptables"
# Inserted at the top so it lands before Oracle's REJECT rule; harmless on other clouds.
for port in 80 443; do
  iptables -C INPUT -p tcp --dport $port -m state --state NEW -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $port -m state --state NEW -j ACCEPT
done
netfilter-persistent save

echo "==> App user and folders"
id feathers >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/feathers --shell /usr/sbin/nologin feathers
mkdir -p "$APP_DIR" "$APP_DIR/storage/public" "$APP_DIR/storage/private" /var/backups/feathers
chown -R feathers:feathers "$APP_DIR" /var/backups/feathers
# The checkout belongs to "feathers", but updates run "sudo git pull" as root.
git config --system --get-all safe.directory | grep -qx "$APP_DIR" || git config --system --add safe.directory "$APP_DIR"

echo "==> PostgreSQL"
DB_PASS_FILE=/root/.feathers-db-password
if [ ! -f "$DB_PASS_FILE" ]; then
  openssl rand -base64 30 | tr -d '/+=' | head -c 32 > "$DB_PASS_FILE"
  chmod 600 "$DB_PASS_FILE"
fi
DB_PASS=$(cat "$DB_PASS_FILE")
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
# PostgreSQL listens on localhost only (Ubuntu default) — never expose 5432.

echo "==> Environment file"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
AUTH_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
CRON_SECRET="$(openssl rand -hex 24)"
APP_URL="https://$DOMAIN"
STORAGE_DIR="$APP_DIR/storage"
SESSION_HOURS=12

WHATSAPP_NUMBER="919876543210"
WHATSAPP_BUSINESS_NAME="NABA Boutique"
STORE_PHONE=""
STORE_EMAIL=""
STORE_ADDRESS="Kerala, India"
INSTAGRAM_URL="https://www.instagram.com/feathers_the_2ndskin_/"

SHIPPING_FLAT=79
FREE_SHIPPING_ABOVE=1499
ESTIMATED_DELIVERY="3–7 working days across India"

# Start with Razorpay TEST keys (rzp_test_...), switch to live keys at go-live.
PAYMENT_GATEWAY="razorpay"
PAYMENT_GATEWAY_KEY=""
PAYMENT_GATEWAY_SECRET=""
PAYMENT_WEBHOOK_SECRET=""
PAYMENT_HOLD_MINUTES=30
WHATSAPP_HOLD_HOURS=24

RESEND_API_KEY=""
MAIL_FROM="NABA Boutique <no-reply@$DOMAIN>"
EOF
  chown feathers:feathers "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

echo "==> Nginx"
cp "$(dirname "$0")/feathers-proxy.conf" /etc/nginx/snippets/feathers-proxy.conf
sed "s/shop.example.com/$DOMAIN/g" "$(dirname "$0")/nginx.conf" > /etc/nginx/sites-available/feathers
rm -f /etc/nginx/sites-enabled/default
# Temporary HTTP-only server so Certbot can verify the domain before the HTTPS config exists.
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  rm -f /etc/nginx/sites-enabled/feathers
  echo "server { listen 80; server_name $DOMAIN www.$DOMAIN; location / { return 200 'ok'; } }" > /etc/nginx/sites-enabled/feathers-acme
  nginx -t && systemctl reload nginx
  certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" \
    || certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"
  rm -f /etc/nginx/sites-enabled/feathers-acme
fi
if [ ! -d "/etc/letsencrypt/live/www.$DOMAIN" ] && ! openssl x509 -noout -text -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | grep -q "DNS:www.$DOMAIN"; then
  # No certificate for www: drop the www HTTPS block.
  python3 - "$DOMAIN" <<'PY'
import re, sys
p = '/etc/nginx/sites-available/feathers'
s = open(p).read()
s = re.sub(r'server \{\n    listen 443 ssl http2;\n    listen \[::\]:443 ssl http2;\n    server_name www\.[^\n]+\n.*?\n\}\n', '', s, count=1, flags=re.S)
open(p, 'w').write(s)
PY
fi
ln -sf /etc/nginx/sites-available/feathers /etc/nginx/sites-enabled/feathers
nginx -t && systemctl reload nginx

echo "==> systemd service"
cp "$(dirname "$0")/feathers.service" /etc/systemd/system/feathers.service
systemctl daemon-reload
systemctl enable feathers

echo "==> Daily backup at 02:30"
cp "$(dirname "$0")/backup.sh" /usr/local/bin/feathers-backup && chmod +x /usr/local/bin/feathers-backup
echo "30 2 * * * root /usr/local/bin/feathers-backup >> /var/log/feathers-backup.log 2>&1" > /etc/cron.d/feathers-backup

echo
echo "Done. Next:"
echo "  1. Edit $APP_DIR/.env (WhatsApp number, Razorpay keys, store contact)."
echo "  2. Copy the code to $APP_DIR and run: sudo bash $APP_DIR/deploy/deploy.sh"
