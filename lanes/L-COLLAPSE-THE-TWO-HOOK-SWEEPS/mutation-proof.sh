#!/usr/bin/env bash
# Every arm this lane added, shown to fail when the thing it claims to check is broken.
#
# The sweep this lane removed had no control of its own: a regex that had stopped matching would
# still have reported a clean estate. Arms added to replace it must not inherit that, so each one is
# mutated here and watched go red.
#
#   bash lanes/L-COLLAPSE-THE-TWO-HOOK-SWEEPS/mutation-proof.sh
set -u
cd "$(dirname "$0")/../.."
GUARD=test/vue3-shape-guard.test.js
SWEPT=test/focus-trap-teardown.test.js
BACKUP=$(mktemp)
OUT=lanes/L-COLLAPSE-THE-TWO-HOOK-SWEEPS/04-mutation-proof.txt
cp "$GUARD" "$BACKUP"
: > "$OUT"

say () { echo "$@" | tee -a "$OUT"; }

restore () { cp "$BACKUP" "$GUARD"; rm -f "$SWEPT.bak"; }
trap restore EXIT

# $1 = label, $2 = jest -t pattern, $3 = expectation (fail|pass)
run_arm () {
  local label="$1" pattern="$2" want="$3"
  if npx jest "$GUARD" --coverage=false -t "$pattern" 2>&1 | grep -qE '^Tests:.*[0-9]+ failed'; then
    got=fail
  else
    got=pass
  fi
  if [ "$got" = "$want" ]; then say "  OK   $label -> $got (wanted $want)"; else say "  WRONG $label -> $got (wanted $want)"; fi
}

say "MUTATION PROOF — the arms this lane added, each broken on purpose"
say "tree: lane/collapse-the-two-hook-sweeps worktree, core 1bcab0b, Vue 2.7.14"
say ""

say "M0 unmutated: every arm passes"
run_arm "directive-hook arm"        "inline directive definition"            pass
run_arm "inline-component arm"      "inline child component"                 pass
run_arm "estate unparseable arm"    "makes THIS guard red"                   pass
run_arm "uniqueness arm"            "exactly one estate sweep"               pass
say ""

say "M1 the scan stops descending into \`directives:\` (the nested reach inherited from the removed sweep)"
cp "$BACKUP" "$GUARD"
perl -0pi -e "s/if \(key !== 'components' && key !== 'directives'\) \{ continue \}/if (key !== 'components') { continue }/" "$GUARD"
run_arm "directive-hook arm"        "inline directive definition"            fail
say ""

say "M2 the scan stops descending into \`components:\`"
cp "$BACKUP" "$GUARD"
perl -0pi -e "s/if \(key !== 'components' && key !== 'directives'\) \{ continue \}/if (key !== 'directives') { continue }/" "$GUARD"
run_arm "inline-component arm"      "inline child component"                 fail
say ""

say "M3 a directive hook name is denied but never reported (the deny list emptied)"
cp "$BACKUP" "$GUARD"
perl -0pi -e "s/  VUE3_DIRECTIVE_HOOKS\.filter\(h => !INSTALLED_DIRECTIVE_HOOKS\.includes\(h\)\)/  []/" "$GUARD"
run_arm "directive-hook arm"        "inline directive definition"            fail
say ""

say "M4 an unreadable file is swallowed instead of reported — the exact defect of the removed sweep"
cp "$BACKUP" "$GUARD"
perl -0pi -e "s/      unresolved\.push\(\`\\\$\{rel\}: parse failed — \\\$\{err\.message\.split\('\\\\n'\)\[0\]\}\`\)\n//" "$GUARD"
run_arm "estate unparseable arm"    "makes THIS guard red"                   fail
say ""

say "M5 the removed sweep is put back — the tripwire against the pair returning"
cp "$BACKUP" "$GUARD"
cp "$SWEPT" "$SWEPT.bak"
git show 8ac6f63:"$SWEPT" > "$SWEPT"
run_arm "uniqueness arm"            "exactly one estate sweep"               fail
cp "$SWEPT.bak" "$SWEPT"
say ""

restore
say "restored: $(git diff --stat -- $GUARD $SWEPT | tail -1)"
