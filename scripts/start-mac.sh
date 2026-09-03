#!/usr/bin/env bash
# Starts backend, frontend, and local SSL proxy in the background (no Terminal.app windows).
# Logs: .logs/*.log
# Stop all services: press Ctrl+C in this shell, or close this terminal session.
# Backend:  https://localhost:5000
# Frontend: https://localhost:3001 (proxied to http://localhost:3000)

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
LOG_DIR="$REPO_ROOT/.logs"

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

cleanup_children() {
  local p
  for p in $(jobs -p 2>/dev/null); do
    kill "$p" 2>/dev/null || true
  done
}

on_interrupt() {
  cleanup_children
  exit 130
}

mkdir -p "$LOG_DIR"
trap cleanup_children EXIT
trap on_interrupt INT TERM

echo "Starting backend, frontend, and SSL proxy in the background (no new windows)."
echo "Logs: $LOG_DIR/backend.log, frontend.log, ssl-proxy.log — tail -f to follow."
echo "Press Ctrl+C here to stop all three."
echo ""

(cd "$REPO_ROOT/backend" && npm run dev) >>"$LOG_DIR/backend.log" 2>&1 &
(cd "$REPO_ROOT/frontend" && npm run dev) >>"$LOG_DIR/frontend.log" 2>&1 &
(cd "$REPO_ROOT" && local-ssl-proxy --source 3001 --target 3000) >>"$LOG_DIR/ssl-proxy.log" 2>&1 &

echo "Backend:  https://localhost:5000"
echo "Frontend: https://localhost:3001"
echo ""

wait
