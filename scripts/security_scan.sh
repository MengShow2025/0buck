#!/bin/bash

# patterns to check: shpat_, shpss_, AIza, sk-
PATTERNS="shpat_|shpss_|AIza|sk-|[0-9a-fA-F]{32}"

echo "Running security scan on staged files..."

STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Search for patterns in staged files, excluding .env and package-lock.json
FORBIDDEN=$(grep -E "$PATTERNS" $STAGED_FILES 2>/dev/null | grep -v ".env" | grep -v "package-lock.json")

if [ ! -z "$FORBIDDEN" ]; then
  echo "🚨 SECURITY VIOLATION: Hardcoded secrets found in staged files!"
  echo "$FORBIDDEN"
  echo "Please remove the secrets and use environment variables instead."
  exit 1
fi

echo "✅ Security scan passed."
exit 0
