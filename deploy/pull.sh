#!/bin/bash
# Pull-based deploy for the shared host (no SSH needed, no server secrets in GitHub).
# Run by a cron job every 5 minutes:
#   APP_DIR=$HOME/apps/staging VENV=$HOME/nodevenv/apps/staging/20/bin/activate \
#   HEALTH_URL=https://staging.meetoluwaseyi.com/readyz bash $HOME/deploy/pull.sh staging >> $HOME/deploy/staging.log 2>&1
#
# It downloads the latest built release from the public deploy/<env> branch, and only when the
# version changed: installs runtime packages, restarts the app (which applies database migrations
# itself on start), checks health, and rolls back to the previous release if the health check fails.
set -euo pipefail

ENVNAME="${1:?usage: pull.sh staging|production}"
REPO="shykeys-data/meetoluwaseyi"
# APP_DIR, VENV (the Node.js app's activate script) and HEALTH_URL come from the cron command,
# or from $HOME/deploy/<env>.conf if it exists. No secrets are needed here.
CONF="$HOME/deploy/$ENVNAME.conf"
# shellcheck source=/dev/null
[ -f "$CONF" ] && source "$CONF"
: "${APP_DIR:?}" "${VENV:?}" "${HEALTH_URL:?}"

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
# The host links node_modules into the app's virtual environment, so install in place (no npm ci).
npm install --omit=dev --no-audit --no-fund
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
npm install --omit=dev --no-audit --no-fund
touch tmp/restart.txt
exit 1
