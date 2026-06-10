#!/usr/bin/env bash
# Local dev stack in one command:
#   - Go API on localhost:8080
#   - Vite dev server on localhost:5173 (proxies /api to the Go server)
# One Ctrl-C stops everything; if either server dies, the other is stopped.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d web/node_modules ]; then
  echo "dev.sh: first run, installing frontend dependencies..."
  (cd web && npm install)
fi

# On exit (Ctrl-C included), stop whichever background job is still running.
trap 'kill $(jobs -p) 2>/dev/null' EXIT

go run ./cmd/spreadlab &
(cd web && npm run dev) &

# wait -n returns when the FIRST job exits; the trap then cleans up the rest.
wait -n
