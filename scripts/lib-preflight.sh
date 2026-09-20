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

# Fails with an actionable message when the backend port is already taken,
# rather than letting an EADDRINUSE get buried in a log file.
assert_port_free() {
  local port="$1" listener
  listener="$(port_listener "$port")"
  [ -n "$listener" ] || return 0

  echo "ERROR: port $port is already in use by \"$listener\"." >&2
  echo "" >&2
  echo "Stop that process, or run the backend on another port by setting" >&2
  echo "PORT in backend/.env and matching BACKEND_LINK in frontend/.env." >&2
  echo "" >&2
  echo "Note: local SAML login only works on ports registered as callback URLs" >&2
  echo "with ITS (currently 4000). Other ports break login but not the rest." >&2
  echo "" >&2
  return 1
}
