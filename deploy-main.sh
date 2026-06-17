#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# deploy-main.sh — merge staging into main and push to production
# Run this only after staging has been tested!
# ─────────────────────────────────────────────────────────────────
set -e
cd "/Users/carl/code/posh services"

git checkout main
git merge staging --no-edit
git push origin main

echo "✅ Pushed to MAIN (https://poshservices.netlify.app)"
