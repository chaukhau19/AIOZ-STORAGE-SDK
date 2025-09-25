#!/usr/bin/env bash
set -euo pipefail

if command -v Xvfb >/dev/null 2>&1; then
  Xvfb :99 -ac +extension RANDR +extension RENDER +extension GLX -noreset 1>/dev/null 2>&1 &
  XVFB_PID=$!
  export DISPLAY=:99
  sleep 2
  trap 'kill ${XVFB_PID} || true' EXIT
fi

if [ $# -eq 0 ]; then
  npx playwright test --workers=1
else
  npx playwright test --workers=1 "$@"
fi
