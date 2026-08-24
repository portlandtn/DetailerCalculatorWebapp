#!/usr/bin/env bash
set -Eeuo pipefail

CALC_ROOT=/opt/calc
RELEASES_DIR="$CALC_ROOT/releases"
CURRENT_LINK="$CALC_ROOT/current"
HEALTH_URL=http://127.0.0.1:18882/
SOURCE_DIR="${GITHUB_WORKSPACE:-$(git rev-parse --show-toplevel)}"

atomic_switch() {
  local target=$1
  local temporary_link="$CALC_ROOT/.current.new"
  rm -f "$temporary_link"
  ln -s "$target" "$temporary_link"
  mv -Tf "$temporary_link" "$CURRENT_LINK"
}

health_check() {
  local code attempt
  for attempt in {1..30}; do
    code=$(curl --silent --output /dev/null --write-out '%{http_code}' \
      --max-time 5 "$HEALTH_URL" 2>/dev/null || true)
    [[ "$code" == 200 ]] && return 0
    sleep 1
  done
  echo "Health check failed after 30 seconds (last HTTP code: ${code:-connection failure})" >&2
  return 1
}

restart_and_check() {
  sudo -n /usr/bin/systemctl restart calc.service
  sudo -n /usr/bin/systemctl is-active --quiet calc.service
  health_check
}

latest_previous_release() {
  local current_target current_name
  current_target=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)
  current_name=${current_target##*/}
  find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
    | sort -r \
    | while read -r release; do
        [[ "$release" != "$current_name" ]] && { echo "$release"; return; }
      done
}

rollback_to_previous() {
  local previous_release
  previous_release=$(latest_previous_release)
  [[ -n "$previous_release" ]] || {
    echo 'No previous release is available for rollback.' >&2
    return 1
  }
  echo "Rolling back to $previous_release"
  atomic_switch "$RELEASES_DIR/$previous_release"
  restart_and_check
}

prune_releases() {
  mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r)
  for release in "${releases[@]:5}"; do
    rm -rf -- "$RELEASES_DIR/$release"
  done
}

deploy() {
  local release_id release_dir previous_target
  release_id="$(date -u +%Y%m%d%H%M%S)-${GITHUB_SHA:-manual}" 
  release_id=${release_id:0:80}
  release_dir="$RELEASES_DIR/$release_id"
  previous_target=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)

  mkdir -p "$RELEASES_DIR"
  mkdir "$release_dir"
  rsync -a --delete --exclude='.git' --exclude='.github' "$SOURCE_DIR/" "$release_dir/"
  atomic_switch "$release_dir"

  if restart_and_check; then
    prune_releases
    echo "Deployment succeeded: $release_id"
    exit 0
  fi

  echo 'New release failed its post-restart health check.' >&2
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    atomic_switch "$previous_target"
    if restart_and_check; then
      echo "Rollback succeeded: $previous_target" >&2
      rm -rf -- "$release_dir"
    else
      echo 'Rollback health check failed.' >&2
    fi
  else
    echo 'No previous release exists; leaving the new release selected for manual recovery.' >&2
  fi
  return 1
}

case "${1:-deploy}" in
  deploy) deploy ;;
  rollback)
    rollback_to_previous
    echo 'Manual rollback succeeded.'
    ;;
  *)
    echo "Usage: $0 [deploy|rollback]" >&2
    exit 2
    ;;
esac
