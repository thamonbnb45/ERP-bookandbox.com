#!/bin/bash
# Auto git push every 30 minutes
# Usage: ./auto-push.sh (run in background)
# Stop:  kill $(cat .auto-push.pid)

cd "$(dirname "$0")"
echo $$ > .auto-push.pid

echo "🚀 Auto-push started (every 30 min) — PID: $$"

while true; do
  sleep 1800  # 30 minutes

  # Check if there are changes
  if [ -n "$(git status --porcelain)" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    git add -A
    git commit -m "auto-save: $TIMESTAMP"
    git push origin main
    echo "✅ [$TIMESTAMP] Pushed changes"
  else
    echo "⏭️  [$(date '+%H:%M')] No changes to push"
  fi
done
