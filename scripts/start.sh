#!/usr/bin/env bash
# Starts backend, frontend, and the local SSL proxy together.
# Backend:  https://localhost:$PORT (PORT from backend/.env, default 4000)
# Frontend: https://localhost:3001 (proxied to http://localhost:3000)

set -e
cd "$(dirname "$0")/.."

# shellcheck source=scripts/lib-preflight.sh
. "$(dirname "$0")/lib-preflight.sh"

BACKEND_PORT="$(read_env_var backend/.env PORT)"
BACKEND_PORT="${BACKEND_PORT:-4000}"
BACKEND_URL="https://localhost:$BACKEND_PORT"

# Fail fast with a readable reason rather than an EADDRINUSE stack trace.
assert_port_free "$BACKEND_PORT"

if ! command -v local-ssl-proxy >/dev/null 2>&1; then
  echo "Installing local-ssl-proxy globally..."
  npm install -g local-ssl-proxy
fi

if [ ! -d backend/node_modules ]; then
  echo "Installing backend dependencies..."
  (cd backend && npm install)
fi

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

pids=()
cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Starting backend ($BACKEND_URL)..."
(cd backend && npm run dev) &
pids+=($!)

echo "Starting frontend (http://localhost:3000)..."
(cd frontend && npm run dev) &
pids+=($!)

echo "Starting SSL proxy (https://localhost:3001 -> http://localhost:3000)..."
local-ssl-proxy --source 3001 --target 3000 &
pids+=($!)

echo ""
echo "All processes started. Press Ctrl+C to stop."
wait
