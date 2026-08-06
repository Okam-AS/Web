#!/usr/bin/env bash
# The whole journey tier at ONE ref, on ports nobody else holds. Same guards as run-journey.sh.
# This is the run the composition lane's §3c needed and did not have: its 8-failure receipts were
# taken on the default ports while a FOREIGN api-server (pid 73160, cwd /Users/svendaneel/okam/wt-jwf)
# held 4010, and `reuseExistingServer: !process.env.CI` made Playwright attach to it.
set -uo pipefail
WT=/Users/svendaneel/okam/web-arrival
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-CANDIDATE-JOURNEYS-ON-ARRIVAL
REF="$1"; LABEL="$2"
OUT="$LANE/runs/${LABEL}.txt"

export CI=1 E2E_WEB_PORT=3889 E2E_FIXTURE_PORT=4889
unset E2E_API_BASE_URL E2E_BASE_URL
for p in 3889 4889; do
  lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1 && { echo "ABORT: port $p busy" | tee "$OUT"; exit 3; }
done

cd "$WT" || exit 3
git checkout --detach --force "$REF" >/dev/null 2>&1 || { echo "ABORT: cannot check out $REF" | tee "$OUT"; exit 3; }
[ -d core/services ] || cp -R /Users/svendaneel/okam/Web-modules/core/. core/
rm -rf .nuxt

# DECLARED DEVIATION, one line, applied so the tier can run at all. meals-statement-month.spec.js
# hardcodes 127.0.0.1:4010 and its first API call is a mutating POST .../statements/drafts followed
# by an irreversible /finalize -- unpatched on a private port that lands in the FOREIGN world.
SF=test/e2e/journeys/meals-statement-month.spec.js
perl -0pi -e "s{const api = process\.env\.E2E_API_BASE_URL \|\| 'http://127\.0\.0\.1:4010';}{const api = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));}" "$SF"
grep -q "E2E_FIXTURE_PORT || 4010" "$SF" && PN="portfix APPLIED to $SF" || PN="portfix NOT APPLIED"

{
  echo "=== ref $REF -> $(git rev-parse HEAD) ==="; git log -1 --format='%h %s' | cat
  echo "=== $PN ==="
  echo "=== core sha: $(git -C core rev-parse HEAD 2>/dev/null) | ports web=3889 fixture=4889 CI=1 ==="
  date -u '+=== started %Y-%m-%dT%H:%M:%SZ ==='
} > "$OUT"

"$LANE/fixture-provenance.sh" 4889 "$OUT.prov" &
PROV=$!
timeout 1800 npx playwright test --reporter=line >> "$OUT" 2>&1
RC=$?
wait $PROV 2>/dev/null; cat "$OUT.prov" >> "$OUT" 2>/dev/null; rm -f "$OUT.prov"
git checkout --force -- "$SF" >/dev/null 2>&1
echo "TIER $LABEL $(git rev-parse --short HEAD) rc=$RC" | tee -a "$OUT"
grep -E "^  [0-9]+ (passed|failed)" "$OUT" | tail -5
