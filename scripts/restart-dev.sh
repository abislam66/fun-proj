#!/usr/bin/env bash
# Restart the TuEats dev server cleanly (kills stale Next on 3001, reinstalls if needed).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Stopping anything on :3001 / :3010…"
lsof -ti tcp:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti tcp:3010 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "→ Ensuring map deps are installed…"
corepack pnpm install

echo "→ Clearing .next cache…"
rm -rf .next

echo "→ Starting Next on http://127.0.0.1:3001 …"
exec corepack pnpm exec next dev --hostname 127.0.0.1 --port 3001
