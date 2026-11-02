#!/usr/bin/env bash
# Build and (re)start the app on the server. Run after every code update:
#   cd /opt/feathers && sudo git pull && sudo bash deploy/deploy.sh
set -euo pipefail
APP_DIR=/opt/feathers
cd "$APP_DIR"

[ -f .env ] || { echo "Missing $APP_DIR/.env — run setup-server.sh first"; exit 1; }
set -a; . ./.env; set +a

echo "==> Install dependencies"
chown -R feathers:feathers "$APP_DIR"
sudo -u feathers -E npm ci --no-audit --no-fund

echo "==> Database migrations"
sudo -u feathers -E npx prisma migrate deploy

echo "==> Build"
sudo -u feathers -E npm run build
# The standalone server needs the static assets and public folder beside it.
sudo -u feathers cp -r .next/static .next/standalone/.next/static
sudo -u feathers cp -r public .next/standalone/public
sudo -u feathers mkdir -p .next/standalone/.next/cache

echo "==> Nginx snippet"
cp deploy/feathers-proxy.conf /etc/nginx/snippets/feathers-proxy.conf
nginx -t && systemctl reload nginx

echo "==> Restart"
systemctl restart feathers
sleep 4
systemctl --no-pager --lines=5 status feathers
curl -fsS -o /dev/null -w "Local health check: HTTP %{http_code}\n" http://127.0.0.1:3000/ || { echo "App did not respond — see: journalctl -u feathers -n 100"; exit 1; }
