#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# deploy-staging.sh — push current work to the staging branch
# ─────────────────────────────────────────────────────────────────
set -e
cd "/Users/carl/code/posh services"

# Make sure we're on staging
git checkout staging

# Stage everything (respects .gitignore)
git add -A

# Commit if there's anything new
if git diff --cached --quiet; then
  echo "ℹ️  Nothing new to commit on staging."
else
  git commit -m "Deploy to staging: $(date '+%Y-%m-%d %H:%M')"
fi

git push origin staging

echo "✅ Pushed to STAGING (https://staging--poshservices.netlify.app)"
