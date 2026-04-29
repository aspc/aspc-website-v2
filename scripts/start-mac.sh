#!/usr/bin/env bash
# Opens backend, frontend, and the local SSL proxy in three separate Terminal.app windows.
# Backend:  https://localhost:5000
# Frontend: https://localhost:3001 (proxied to http://localhost:3000)

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

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

open_terminal() {
  local title="$1"
  local cmd="$2"
  osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$REPO_ROOT' && echo '=== $title ===' && $cmd"
    set custom title of front window to "$title"
end tell
EOF
}

echo "Launching backend, frontend, and SSL proxy in separate Terminal windows..."
open_terminal "ASPC Backend"   "cd backend && npm run dev"
open_terminal "ASPC Frontend"  "cd frontend && npm run dev"
open_terminal "ASPC SSL Proxy" "local-ssl-proxy --source 3001 --target 3000"

echo ""
echo "Backend:  https://localhost:5000"
echo "Frontend: https://localhost:3001"
