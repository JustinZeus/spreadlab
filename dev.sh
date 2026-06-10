#!/usr/bin/env bash
# Local dev stack in one command:
#   - Go API on localhost:8080
#   - Vite dev server on localhost:5173 (proxies /api to the Go server)
# One Ctrl-C stops everything; if either server dies, the other is stopped.
# If a port is already taken (usually a stale server), offers to kill it.
set -euo pipefail

cd "$(dirname "$0")"

# free_port checks whether something is listening on the port and, when run
# interactively, offers to kill it. Otherwise it refuses to continue: never
# kill processes silently.
free_port() {
  local port="$1" name="$2"
  local listener_pid
  listener_pid=$(ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)
  [ -z "$listener_pid" ] && return 0

  local listener_cmd
  listener_cmd=$(ps -p "$listener_pid" -o comm= 2>/dev/null || echo unknown)
  echo "dev.sh: port $port ($name) is already in use by PID $listener_pid ($listener_cmd)."

  local answer="n"
  if [ -t 0 ]; then
    read -r -p "Kill it and continue? [Y/n] " answer
    answer=${answer:-y}
  fi
  case "$answer" in
    [Yy]*)
      kill "$listener_pid"
      sleep 0.5
      ;;
    *)
      echo "dev.sh: aborting; free port $port first."
      exit 1
      ;;
  esac
}

free_port 8080 "Go API"
free_port 5173 "Vite"

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
