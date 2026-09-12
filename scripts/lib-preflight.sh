#!/usr/bin/env bash
# Shared helpers for the start scripts. Sourced, not executed.

# Reads a KEY=value pair out of an .env file, tolerating spaces and quotes.
# Usage: read_env_var <file> <key>
read_env_var() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$file" \
    | tail -1 \
    | tr -d '\r' \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" \
    | sed 's/[[:space:]]*#.*$//' \
    | tr -d '[:space:]'
}

# Prints the name of the process listening on a TCP port, or nothing if free.
port_listener() {
  command -v lsof >/dev/null 2>&1 || return 0
  lsof -iTCP:"$1" -sTCP:LISTEN -P -n -F c 2>/dev/null | sed -n 's/^c//p' | head -1
}

# Fails with an actionable message when the backend port is already taken.
# macOS AirPlay Receiver squats on 5000 and 7000, and re-enables itself across
# OS updates, so call that case out by name instead of leaving an EADDRINUSE
# buried in a log file.
assert_port_free() {
  local port="$1" listener
  listener="$(port_listener "$port")"
  [ -n "$listener" ] || return 0

  echo "ERROR: port $port is already in use by \"$listener\"." >&2
  echo "" >&2
  if [ "$listener" = "ControlCenter" ]; then
    echo "That is macOS AirPlay Receiver, which claims ports 5000 and 7000." >&2
    echo "Fix it with either option:" >&2
    echo "" >&2
    echo "  1. Turn AirPlay Receiver off:" >&2
    echo "     System Settings > General > AirDrop & Handoff > AirPlay Receiver" >&2
    echo "     (macOS re-enables this after some updates, so it may come back.)" >&2
    echo "" >&2
    echo "  2. Run the backend on another port - add this to backend/.env:" >&2
    echo "         PORT=4000" >&2
    echo "     and set this in frontend/.env:" >&2
    echo "         BACKEND_LINK=\"https://localhost:4000\"" >&2
    echo "     Note: local SAML login will fail on any port other than 5000" >&2
    echo "     until ITS registers the new callback URL. Everything else works." >&2
  else
    echo "Stop that process, or pick another port by setting PORT in backend/.env" >&2
    echo "and matching BACKEND_LINK in frontend/.env." >&2
  fi
  echo "" >&2
  return 1
}
