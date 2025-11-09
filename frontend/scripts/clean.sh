#!/usr/bin/env bash
set -euo pipefail

find src -type f \( -name '*.js' -o -name '*.js.map' -o -name '*.d.ts' -o -name '*.d.ts.map' \) -delete || true
