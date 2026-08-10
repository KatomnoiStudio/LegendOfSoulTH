#!/usr/bin/env bash
# Serialise heavy verify runs across concurrently-dispatched agents.
#
# Several belt lanes run in parallel, but each one ends with `npm test` (~50s, CPU-bound).
# Six of those at once on one machine thrash and produce FALSE failures, which is worse than
# slow: the belt end cannot tell a real regression from resource starvation. This lock lets the
# lanes write code in parallel and take turns only for the expensive part.
#
# Usage (from the repo root or any worktree):
#   bash tools/test-lock.sh npm test
#   bash tools/test-lock.sh npm run build
#
# mkdir is atomic on every filesystem we run on (including Git Bash on Windows), so it is the
# lock primitive rather than a flag file that two waiters could both create.

set -u

LOCK_DIR="${TMPDIR:-/tmp}/losth-verify.lock"
STALE_SECONDS=900   # 15 min: longer than the slowest verify, short enough to self-heal a crash
WAIT_SECONDS=1200   # give up after 20 min rather than hang a dispatch forever

waited=0
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  # Reclaim a lock whose holder died mid-run.
  if [ -f "$LOCK_DIR/started" ]; then
    started=$(cat "$LOCK_DIR/started" 2>/dev/null || echo 0)
    now=$(date +%s)
    if [ $((now - started)) -gt "$STALE_SECONDS" ]; then
      echo "test-lock: reclaiming stale lock (held $((now - started))s)" >&2
      rm -rf "$LOCK_DIR"
      continue
    fi
  fi
  if [ "$waited" -ge "$WAIT_SECONDS" ]; then
    echo "test-lock: gave up after ${WAIT_SECONDS}s waiting for $LOCK_DIR" >&2
    exit 75   # EX_TEMPFAIL — the caller should report this, not treat it as a test failure
  fi
  sleep 5
  waited=$((waited + 5))
done

date +%s > "$LOCK_DIR/started"
# Release on any exit path, including a failed command or a kill.
trap 'rm -rf "$LOCK_DIR"' EXIT INT TERM

"$@"
