#!/bin/bash
# Falsify the duplicate-key guard: show it RED on a tree carrying a real simulated merge result,
# and GREEN on the clean tip. Every mutation is asserted to have landed before its result is read.
#
# Runs bash, not zsh, on purpose: PIPESTATUS is not populated by zsh and this script reads exit
# codes. Nothing here is piped into a grep whose status would mask the command's.
set -u

W=/Users/svendaneel/okam/web-dupkeyguard          # the tree under measurement
L=/Users/svendaneel/okam/Web-modules/lanes/L-DUPLICATE-KEY-GUARD   # evidence, a different tree
CLI="node scripts/translation-duplicate-keys.js"

say () { printf '\n===== %s =====\n' "$*"; }
fail () { printf 'ASSERTION FAILED: %s\n' "$*"; exit 99; }

cd "$W" || fail "no worktree at $W"

say "0. TREE UNDER MEASUREMENT"
git rev-parse HEAD
git status --porcelain

say "1. CLEAN TIP — the guard must be GREEN, and must say what it looked at"
$CLI
rc=$?
printf 'cli exit=%s\n' "$rc"
[ "$rc" -eq 0 ] || fail "guard is red on the clean tip"
# Jest output goes to a FILE and the file is grepped. Piping jest into `grep | head` closes the
# pipe under it, its workers take SIGPIPE, and it then reports suites as failed that never ran —
# the first run of this script recorded "12 failed suites, 2596 total" that way, against a real
# 127/2965. A truncating pipeline is not a measurement.
npx jest --ci --coverage=false test/translations-duplicate-keys.test.js > "$L/clean-gate.txt" 2>&1
[ $? -eq 0 ] || fail "gate is red on the clean tip"
grep -E "^(Tests:|Test Suites:)" "$L/clean-gate.txt"

# ---------------------------------------------------------------------------------------------
# Each case below reproduces one of the nine merge results that `git merge-file` produced without
# a conflict, byte for byte, from the same three blobs the simulation used.
# ---------------------------------------------------------------------------------------------
run_case () {
  local lane="$1" path="$2" key="$3" label="$4"

  say "CASE: $label  —  $lane INTO candidate/fe-compose-2026-08-05  ->  $path"
  python3 "$L/reproduce-merge.py" "$lane" "$path" "$L/merged.tmp.ts" || fail "reproduction failed"

  cp "$L/merged.tmp.ts" "$W/$path"

  # ASSERT THE MUTATION LANDED. A cp that silently did nothing, or a merge output that carried
  # conflict markers instead of a duplicate, would make everything below meaningless.
  local changed markers occurrences
  changed=$(git diff --numstat -- "$path" | wc -l | tr -d ' ')
  markers=$(grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' "$W/$path")
  occurrences=$(grep -c "^  $key:" "$W/$path")
  printf 'mutation landed: files-changed=%s conflict-markers=%s occurrences-of-%s=%s\n' \
    "$changed" "$markers" "$key" "$occurrences"
  [ "$changed" = "1" ] || fail "$path was not modified"
  [ "$markers" = "0" ] || fail "$path carries conflict markers — this is the LOUD case, not the silent one"
  [ "$occurrences" = "2" ] || fail "expected $key twice in $path, found $occurrences"

  # The file still compiles and still imports: this is not a broken file, it is a valid one.
  node -e "
    const ts = require('typescript'); const fs = require('fs');
    const sf = ts.createSourceFile('$path', fs.readFileSync('$W/$path','utf8'),
      ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    if ((sf.parseDiagnostics||[]).length) { console.log('PARSE ERRORS'); process.exit(1) }
    console.log('typescript parses it with 0 syntax diagnostics — nothing else would complain');
  " || fail "reproduced file does not parse"

  printf -- '--- guard CLI ---\n'
  $CLI
  rc=$?
  printf 'cli exit=%s  (expected 1)\n' "$rc"
  [ "$rc" -eq 1 ] || fail "CLI did not red on $path"

  printf -- '--- the gate: the whole jest suite, the one `npm test` runs ---\n'
  npx jest --ci --coverage=false > "$L/mutated-gate-$(basename "$path" .ts).txt" 2>&1
  local jest_rc=$?
  grep -E "^(Test Suites:|Tests:)" "$L/mutated-gate-$(basename "$path" .ts).txt"
  printf 'suites that failed: '
  grep -E "^FAIL " "$L/mutated-gate-$(basename "$path" .ts).txt" | tr '\n' ' '
  printf '\njest exit=%s  (expected non-zero)\n' "$jest_rc"
  [ "$jest_rc" -ne 0 ] || fail "the jest gate stayed GREEN on a duplicate — the check is not wired"

  git checkout -- "$path"
  [ -z "$(git diff --name-only -- "$path")" ] || fail "$path not restored"
  rm -f "$L/merged.tmp.ts"
  printf 'restored %s\n' "$path"
}

run_case lane/fe-events-margin-surfaces translations/en.ts mrgs_err_projection_behind \
  "MONEY — one variant says the week was not frozen, the other says the figures are a floor"
run_case lane/mrg-waste-frontend        translations/no.ts mrgs_waste_err_quantity \
  "VALIDATION CONTRACT — greater than zero, or may be left empty"

# ---------------------------------------------------------------------------------------------
say "4. THE FOURTH FILE — a locale nobody listed here"
# The finding is about the shape of these files, not about three paths. A guard scoped to
# translations/{no,en,de}.ts passes the day someone adds a fourth language or a second locale
# directory. These two files are created, measured and deleted; neither is committed.
mkdir -p "$W/platform/locales"
printf 'export default {\n  a_key: %s,\n  b_key: %s,\n  a_key: %s\n}\n' "'one'" "'two'" "'three'" > "$W/translations/sv.ts"
printf 'export default {\n  c_key: %s,\n  c_key: %s\n}\n' "'x'" "'y'" > "$W/platform/locales/fr.ts"
[ -f "$W/translations/sv.ts" ] || fail "sv.ts was not written"
[ -f "$W/platform/locales/fr.ts" ] || fail "fr.ts was not written"
$CLI
rc=$?
printf 'cli exit=%s  (expected 1)\n' "$rc"
[ "$rc" -eq 1 ] || fail "guard did not see a locale file nobody listed"
rm -f "$W/translations/sv.ts" "$W/platform/locales/fr.ts"
rmdir "$W/platform/locales" 2>/dev/null

say "5. BACK TO CLEAN"
git status --porcelain
$CLI
rc=$?
printf 'cli exit=%s  (expected 0)\n' "$rc"
[ "$rc" -eq 0 ] || fail "tree not restored"

say "6. THE SHARED CHECKOUT'S WORKING TREE, read-only"
# The census counted the dirty working tree as a 47th claimant. It is not this lane's tree, and
# nothing is written to it — the guard only reads.
node "$W/scripts/translation-duplicate-keys.js" /Users/svendaneel/okam/Web-modules
printf 'cli exit=%s\n' "$?"

say "DONE"
