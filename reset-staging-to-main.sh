#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# reset-staging-to-main.sh — discard staging changes, reset to main
# ─────────────────────────────────────────────────────────────────
set -e
cd "/Users/carl/code/posh services"

git checkout main
git pull origin main
git checkout staging
git reset --hard main
git push origin staging --force

echo "✅ Staging now matches main — locally and on GitHub (https://github.com/cloudcmo/poshservices)"
