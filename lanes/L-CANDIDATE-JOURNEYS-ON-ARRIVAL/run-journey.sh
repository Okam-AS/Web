#!/usr/bin/env bash
# Run ONE journey spec against ONE ref, in this lane's own detached worktree, on ports
# nobody else holds, with servers that are never reused.
#
# Inherited verbatim from lanes/L-JOURNEY-REGRESSION-BISECT/run-step.sh, because those two
# settings are load-bearing and were proved on this exact tier:
#
#   CI=1                  -> playwright.config's `reuseExistingServer: !CI` becomes false. Port 4010
#                            is held by a FOREIGN api-server (pid 73160, cwd /Users/svendaneel/okam/wt-jwf).
#                            Without CI=1 a default-port run silently attaches to it and reports a
#                            result about another lane's fixture.
#                            (F-SURVIVING-FIXTURE-SERVES-STALE-CODE / F-DEV-SERVERS-SHARE-BUILD)
#   private ports         -> 3889/4889, asserted free before the run. 3777/4777 belong to the bisect.
#   no E2E_API_BASE_URL   -> setting it flips the config to live mode, which grep-inverts @fixture and
#                            would run NOTHING while reporting success. Absence is load-bearing.
#   rm -rf .nuxt          -> my own build output only. The shared node_modules/.cache is content-hash
#                            keyed and belongs to other lanes; never touched.
#   core/ pre-populated   -> ensureCore() returns borrowed:false and mutates no other checkout.
#                            (F-CORE-PIN-ON-NO-REMOTE). Every ref here pins core at 1bcab0b6, which is
#                            what the shared clean core/ is at, so the copy is correct at each ref.
set -uo pipefail

WT=/Users/svendaneel/okam/web-arrival
LANE=/Users/svendaneel/okam/Web-modules/lanes/L-CANDIDATE-JOURNEYS-ON-ARRIVAL
REF="$1"          # commit-ish
SPEC="$2"         # basename without .spec.js
LABEL="$3"        # receipt name
PATCH="${4:-}"    # optional: "portfix" to apply the E2E_FIXTURE_PORT one-liner before running
OUT="$LANE/runs/${LABEL}.txt"

export CI=1
export E2E_WEB_PORT=3889
export E2E_FIXTURE_PORT=4889
unset E2E_API_BASE_URL E2E_BASE_URL

for p in 3889 4889; do
  if lsof -iTCP:$p -sTCP:LISTEN -P -n >/dev/null 2>&1; then
    echo "ABORT: port $p is busy before the run started" | tee "$OUT"; exit 3
  fi
done

cd "$WT" || exit 3
git checkout --detach --force "$REF" >/dev/null 2>&1 || { echo "ABORT: cannot check out $REF" | tee "$OUT"; exit 3; }
[ -d core/services ] || cp -R /Users/svendaneel/okam/Web-modules/core/. core/
rm -rf .nuxt

SPECFILE="test/e2e/journeys/${SPEC}.spec.js"
if [ ! -f "$SPECFILE" ]; then
  echo "ABSENT: $SPECFILE does not exist at $(git rev-parse --short HEAD)" | tee "$OUT"; exit 4
fi

PATCHNOTE="none"
if [ "$PATCH" = "portfix" ]; then
  # DECLARED DEVIATION. meals-statement-month.spec.js hardcodes 127.0.0.1:4010 and ignores
  # E2E_FIXTURE_PORT. Its first API call is a mutating POST .../statements/drafts followed by an
  # irreversible /finalize. Run unpatched on a private port it would create and finalize a statement
  # inside the FOREIGN world on 4010. Run on 4010 it cannot start, because that port is not mine.
  # So the one port expression is replaced with the one three sibling specs and
  # test/e2e/support/journey.js:528 already use -- byte-for-byte the fix in commit 4772c13. Applied
  # identically at every ref so the comparison stays fair, and never committed.
  perl -0pi -e "s{const api = process\.env\.E2E_API_BASE_URL \|\| 'http://127\.0\.0\.1:4010';}{const api = process.env.E2E_API_BASE_URL || ('http://127.0.0.1:' + (process.env.E2E_FIXTURE_PORT || 4010));}" "$SPECFILE"
  if grep -q "E2E_FIXTURE_PORT || 4010" "$SPECFILE"; then PATCHNOTE="portfix APPLIED"; else PATCHNOTE="portfix FAILED-TO-APPLY"; fi
fi

{
  echo "=== ref $REF -> $(git rev-parse HEAD) ==="
  git log -1 --format='%h %s' | cat
  echo "=== spec: $SPEC | spec blob: $(git rev-parse "HEAD:${SPECFILE}") | patch: $PATCHNOTE ==="
  echo "=== core: $(ls core | wc -l | tr -d ' ') entries | core sha: $(git -C core rev-parse HEAD 2>/dev/null || echo n/a) ==="
  echo "=== ports web=$E2E_WEB_PORT fixture=$E2E_FIXTURE_PORT CI=$CI E2E_API_BASE_URL=<unset> ==="
  date -u '+=== started %Y-%m-%dT%H:%M:%SZ ==='
} > "$OUT"

"$LANE/fixture-provenance.sh" 4889 "$OUT.prov" &
PROV=$!
timeout 900 npx playwright test "$SPECFILE" --reporter=line >> "$OUT" 2>&1
RC=$?
wait $PROV 2>/dev/null; cat "$OUT.prov" >> "$OUT" 2>/dev/null; rm -f "$OUT.prov"

# Three shapes, told apart rather than lumped into "red":
#   PASS         the walk completes
#   FAIL-ASSERT  the walk ran and an assertion/step failed
#   HARNESS      the walk never started (server, port, core, compile, no tests collected)
if grep -qE "^  [0-9]+ passed" "$OUT" && ! grep -qE "^  [0-9]+ failed" "$OUT"; then SHAPE=PASS
elif grep -qE "^  [0-9]+ failed" "$OUT"; then SHAPE=FAIL-ASSERT
else SHAPE=HARNESS; fi

git checkout --force -- "$SPECFILE" >/dev/null 2>&1
echo "RESULT $LABEL $(git rev-parse --short HEAD) $SHAPE rc=$RC" | tee -a "$OUT"
