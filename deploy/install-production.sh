#!/usr/bin/env bash
set -Eeuo pipefail

[[ "$EUID" -eq 0 ]] || { echo 'Run this script with sudo.' >&2; exit 1; }

REPO=/home/jedmay/repos/DetailerCalculatorWebapp
ROOT=/opt/calc
RELEASES="$ROOT/releases"
CURRENT="$ROOT/current"
USER_NAME=jedmay
USER_ID=1000
USER_BUS="unix:path=/run/user/$USER_ID/bus"
HEALTH_LOCAL=http://127.0.0.1:18882/
HEALTH_PUBLIC=https://calc.jedmay.com/

health_check() {
  local url=$1 code attempt
  for attempt in {1..30}; do
    code=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)
    [[ "$code" == 200 ]] && return 0
    sleep 1
  done
  echo "Health check failed after 30 seconds: $url (last HTTP code: ${code:-connection failure})" >&2
  return 1
}

user_systemctl() {
  runuser -u "$USER_NAME" -- env \
    XDG_RUNTIME_DIR="/run/user/$USER_ID" \
    DBUS_SESSION_BUS_ADDRESS="$USER_BUS" \
    systemctl --user "$@"
}

atomic_switch() {
  local target=$1 temporary="$ROOT/.current.new"
  rm -f "$temporary"
  ln -s "$target" "$temporary"
  mv -Tf "$temporary" "$CURRENT"
}

mkdir -p "$RELEASES"
previous_target=$(readlink -f "$CURRENT" 2>/dev/null || true)
release="initial-$(date -u +%Y%m%d%H%M%S)"
release_dir="$RELEASES/$release"
mkdir "$release_dir"
rsync -a --delete --exclude='.git' --exclude='.github' "$REPO/" "$release_dir/"
chown -R "$USER_NAME:$USER_NAME" "$ROOT"
atomic_switch "$release_dir"

install -o root -g root -m 0644 "$REPO/deploy/calc.service" /etc/systemd/system/calc.service
install -o root -g root -m 0440 "$REPO/deploy/calc-deploy.sudoers" /etc/sudoers.d/calc-deploy
visudo -cf /etc/sudoers.d/calc-deploy
systemctl daemon-reload
systemctl enable calc.service

old_was_enabled=0
if user_systemctl is-enabled --quiet detailer-calculator.service; then
  old_was_enabled=1
fi

echo 'Stopping the old calculator service for controlled cutover.'
user_systemctl stop detailer-calculator.service
systemctl restart calc.service

if health_check "$HEALTH_LOCAL" && health_check "$HEALTH_PUBLIC" && systemctl is-active --quiet calc.service; then
  if [[ "$old_was_enabled" -eq 1 ]]; then
    user_systemctl disable detailer-calculator.service
  fi
  echo 'Cutover succeeded.'
  echo "Current release: $(readlink -f "$CURRENT")"
  echo 'Local health: HTTP 200'
  echo 'Public health: HTTP 200'
  exit 0
fi

echo 'New calc.service failed health verification; restoring old service.' >&2
systemctl stop calc.service || true
if [[ -n "$previous_target" && -d "$previous_target" ]]; then
  atomic_switch "$previous_target"
fi
user_systemctl start detailer-calculator.service
if health_check "$HEALTH_LOCAL" && health_check "$HEALTH_PUBLIC"; then
  echo 'Rollback to detailer-calculator.service succeeded.' >&2
else
  echo 'Rollback health verification failed.' >&2
fi
exit 1
