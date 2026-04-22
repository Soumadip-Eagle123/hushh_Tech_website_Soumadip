#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SMOKE_SUITES=(
  "tests/oauthStart.test.ts"
  "tests/authHost.test.ts"
  "tests/deleteAccountApiRoute.test.ts"
  "tests/publicInvestorProfileApiRoute.test.ts"
  "tests/mainWebRuntime.test.ts"
)

echo "Running compact smoke suite..."
npx vitest run "${SMOKE_SUITES[@]}"

if [ -n "${SMOKE_REPORT_PATH:-}" ]; then
  node -e '
    const fs = require("fs");
    const { dirname } = require("path");
    const path = process.argv[1];
    const suites = process.argv.slice(2);
    fs.mkdirSync(dirname(path), { recursive: true });
    fs.writeFileSync(
      path,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          suites,
          status: "passed"
        },
        null,
        2
      )
    );
  ' "$SMOKE_REPORT_PATH" "${SMOKE_SUITES[@]}"
fi
