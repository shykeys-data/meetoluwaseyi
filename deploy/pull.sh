#!/bin/bash
# Pull-based deploy for the shared host (no SSH needed, no server secrets in GitHub).
# Run by a cron job every 5 minutes:
#   bash $HOME/deploy/pull.sh staging   >> $HOME/logs/deploy-staging.log 2>&1
#   bash $HOME/deploy/pull.sh production >> $HOME/logs/deploy-production.log 2>&1
#
# It downloads the latest built release from the public deploy/<env> branch, and only when the
# version changed: installs runtime packages, migrates the database, restarts the app, checks health,
# and rolls back to the previous release if the health check fails.
set -euo pipefail

ENVNAME="${1:?usage: pull.sh staging|production}"
REPO="shykeys-data/meetoluwaseyi"
CONF="$HOME/deploy/$ENVNAME.conf"
# shellcheck source=/dev/null
source "$CONF"   # sets APP_DIR, VENV (nodevenv activate script), HEALTH_URL, and the app's env vars file ENV_FILE
: "${APP_DIR:?}" "${VENV:?}" "${HEALTH_URL:?}" "${ENV_FILE:?}"

LOCK="$HOME/deploy/.$ENVNAME.lock"
exec 9>"$LOCK"
flock -n 9 || exit 0

WORK="$HOME/deploy/work-$ENVNAME"
mkdir -p "$WORK"
cd "$WORK"

curl -fsSL --max-time 60 -o release.tgz "https://codeload.github.com/$REPO/tar.gz/refs/heads/deploy/$ENVNAME"
rm -rf incoming && mkdir incoming && tar -xzf release.tgz -C incoming --strip-components=1
NEW="$(cat incoming/VERSION)"
CUR="$(cat "$APP_DIR/VERSION" 2>/dev/null || echo none)"
[ "$NEW" = "$CUR" ] && exit 0

echo "$(date -u +%FT%TZ) deploying $ENVNAME $CUR -> $NEW"
# Keep the current release so we can roll back.
rm -rf previous && mkdir previous
for f in dist app.cjs package.json package-lock.json VERSION; do
  [ -e "$APP_DIR/$f" ] && cp -a "$APP_DIR/$f" previous/
done

# Swap in the new files (node_modules is managed by the host's Node.js app and left alone).
rm -rf "$APP_DIR/dist"
cp -a incoming/dist incoming/app.cjs incoming/package.json incoming/package-lock.json incoming/VERSION "$APP_DIR/"

# shellcheck source=/dev/null
source "$VENV"
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund
set -a; source "$ENV_FILE"; set +a
node dist/jobs/cli.js migrate
mkdir -p tmp && touch tmp/restart.txt

ok=0
for i in $(seq 1 20); do
  sleep 3
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then ok=1; break; fi
done
if [ "$ok" = 1 ]; then
  echo "$(date -u +%FT%TZ) $ENVNAME is healthy on $NEW"
  exit 0
fi

echo "$(date -u +%FT%TZ) health check failed, rolling back to $CUR"
rm -rf "$APP_DIR/dist"
cp -a "$WORK/previous/." "$APP_DIR/"
npm ci --omit=dev --no-audit --no-fund
touch tmp/restart.txt
exit 1
