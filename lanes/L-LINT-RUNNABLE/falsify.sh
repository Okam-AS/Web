#!/usr/bin/env bash
# L-LINT-RUNNABLE falsification driver.
#
# Proves `npm run lint` REDS on a rule already configured as `error`, rather than proving
# that eslint started. Every mutation is asserted to have LANDED before its result is read.
#
# No output of a lint run is ever piped into `head`/`grep`: eslint writes JSON to a file with
# `-o` and the file is read afterwards. A sibling lane's first falsification run reported a
# STRONGER red than reality because `head` closed a pipe and jest's workers took SIGPIPE.
#
# Run from anywhere. Writes only into $L (the lane dir on the plan root) and mutates two files
# in $W, each reverted and asserted reverted.
set -u -o pipefail

W=/Users/svendaneel/okam/web-lintrunnable
L=/Users/svendaneel/okam/Web-modules/lanes/L-LINT-RUNNABLE
JS=utils/body-scroll-lock.js
VUE=components/admin/growth/GrowthSendGate.vue
FAILURES=0

say () { printf '\n=== %s ===\n' "$*"; }
ok  () { printf 'ASSERT OK   %s\n' "$*"; }
bad () { printf 'ASSERT FAIL %s\n' "$*"; FAILURES=$((FAILURES + 1)); }
eq  () { # eq <label> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1 = $2"; else bad "$1: expected [$2] got [$3]"; fi
}

# --- readers -------------------------------------------------------------------------------
# Every number below is read out of an eslint JSON report on disk, never off a pipe.
errors_in ()  { node -e 'const r=require(process.argv[1]);console.log(r.reduce((a,f)=>a+f.errorCount,0))' "$1"; }
warns_in ()   { node -e 'const r=require(process.argv[1]);console.log(r.reduce((a,f)=>a+f.warningCount,0))' "$1"; }
files_in ()   { node -e 'const r=require(process.argv[1]);console.log(r.length)' "$1"; }
rules_in ()   { node -e '
  const r=require(process.argv[1]), root=process.argv[2]+"/";
  const out=[];
  for(const f of r) for(const m of f.messages) if(m.severity===2)
    out.push((m.ruleId||"FATAL")+" @ "+f.filePath.replace(root,"")+":"+m.line);
  console.log(out.sort().join("\n"));' "$1" "$W"; }

# lint_repo <outfile>  -> echoes the npm exit code
lint_repo () { ( cd "$W" && npm run --silent lint -- --format json -o "$1" >/dev/null 2>&1; echo $?; ); }
# lint_file <path> <outfile> -> echoes the eslint exit code
lint_file () { ( cd "$W" && ./node_modules/.bin/eslint --format json -o "$2" "$1" >/dev/null 2>&1; echo $?; ); }

# assert_landed <path> <needle> <expected-added-lines>
assert_landed () {
  local p="$1" needle="$2" added="$3"
  local numstat hits status
  numstat=$( cd "$W" && git diff --numstat -- "$p" | tr '\t' ' ' )
  hits=$( cd "$W" && grep -c -- "$needle" "$p" )
  eq "mutation landed: git numstat (added deleted path) for $p" "$added 0 $p" "$numstat"
  eq "mutation landed: occurrences of the introduced token in $p" "1" "$hits"
  status=$( cd "$W" && git status --porcelain -- "$p" )
  eq "mutation landed: git sees $p modified" " M $p" "$status"
}

# assert_reverted <path>
assert_reverted () {
  local p="$1" status
  status=$( cd "$W" && git status --porcelain -- "$p" )
  eq "reverted: git status for $p is empty" "" "$status"
}

say "0. the tree under measurement"
( cd "$W" && printf 'worktree  %s\nbranch    %s\nHEAD      %s\ncore@     %s\n' \
   "$W" "$(git rev-parse --abbrev-ref HEAD)" "$(git rev-parse HEAD)" "$(git -C core rev-parse HEAD)" )
printf 'as of     %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
( cd "$W" && echo "dirty:" && git status --porcelain )

say "1. CLEAN RUN — the repository as it stands"
RC=$(lint_repo "$L/run-clean.json")
CLEAN_E=$(errors_in "$L/run-clean.json"); CLEAN_W=$(warns_in "$L/run-clean.json"); CLEAN_F=$(files_in "$L/run-clean.json")
echo "npm run lint  -> exit $RC   files $CLEAN_F   errors $CLEAN_E   warnings $CLEAN_W"
eq "clean repo run exits 1 (there is a pre-existing backlog; see run.md)" "1" "$RC"

say "1b. CLEAN RUN — the two files about to be mutated, before the mutation"
RC=$(lint_file "$JS" "$L/run-clean-js.json");  eq "eslint $JS exit" "0" "$RC"
eq "  errors" "0" "$(errors_in "$L/run-clean-js.json")"
eq "  warnings" "0" "$(warns_in "$L/run-clean-js.json")"
RC=$(lint_file "$VUE" "$L/run-clean-vue.json"); eq "eslint $VUE exit" "0" "$RC"
eq "  errors" "0" "$(errors_in "$L/run-clean-vue.json")"
eq "  warnings" "0" "$(warns_in "$L/run-clean-vue.json")"

say "2. MUTATION A — eqeqeq (resolved severity: [\"error\",\"always\",{\"null\":\"ignore\"}]) in a .js"
printf '\nexport function lintFalsificationProbe (a, b) { return a == b }\n' >> "$W/$JS"
assert_landed "$JS" 'a == b' 2
RC=$(lint_file "$JS" "$L/run-mutated-js.json")
echo "eslint $JS -> exit $RC"
eq "mutated file run exits 1" "1" "$RC"
eq "  errors in that file" "1" "$(errors_in "$L/run-mutated-js.json")"
echo "  the error:"; rules_in "$L/run-mutated-js.json" | sed 's/^/    /'
eq "  it is eqeqeq, and it is the line just added" "eqeqeq @ $JS:88" "$(rules_in "$L/run-mutated-js.json")"

say "2b. and the repo-wide command reds by exactly that one"
RC=$(lint_repo "$L/run-mutated-repo.json")
MUT_E=$(errors_in "$L/run-mutated-repo.json")
echo "npm run lint -> exit $RC   errors $MUT_E  (clean was $CLEAN_E)"
eq "repo errors moved by exactly 1" "$((CLEAN_E + 1))" "$MUT_E"
DIFF=$(diff <(rules_in "$L/run-clean.json") <(rules_in "$L/run-mutated-repo.json") | grep '^>' || true)
echo "  the only new error line-item repo-wide:"; echo "$DIFF" | sed 's/^/    /'
eq "  and it is the introduced one" "> eqeqeq @ $JS:88" "$DIFF"

say "3. REMOVE IT — and the same commands green again"
( cd "$W" && git checkout -- "$JS" )
assert_reverted "$JS"
RC=$(lint_file "$JS" "$L/run-restored-js.json"); eq "eslint $JS exit" "0" "$RC"
eq "  errors" "0" "$(errors_in "$L/run-restored-js.json")"

say "4. MUTATION B — the same rule inside a .vue <script>, because .vue is most of this repo"
# Inserted AFTER the import block, not at the top of <script>. Above the imports it also trips
# `import/first` — correct behaviour, but it would make this a two-rule demonstration by accident.
node -e '
  const fs=require("fs"), p=process.argv[1];
  const s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("\nexport default {");
  if(i<0){ console.error("no export default"); process.exit(1); }
  fs.writeFileSync(p, s.slice(0,i+1) + "export const lintFalsificationProbe = 1 == 2\n\n" + s.slice(i+1));
' "$W/$VUE"
assert_landed "$VUE" '1 == 2' 2
RC=$(lint_file "$VUE" "$L/run-mutated-vue.json")
echo "eslint $VUE -> exit $RC"
eq "mutated .vue run exits 1" "1" "$RC"
eq "  errors in that file" "1" "$(errors_in "$L/run-mutated-vue.json")"
echo "  the error:"; rules_in "$L/run-mutated-vue.json" | sed 's/^/    /'
eq "  it is eqeqeq inside the <script> block" "eqeqeq @ $VUE:130" "$(rules_in "$L/run-mutated-vue.json")"
( cd "$W" && git checkout -- "$VUE" )
assert_reverted "$VUE"
RC=$(lint_file "$VUE" "$L/run-restored-vue.json"); eq "eslint $VUE exit" "0" "$RC"

say "5. FINAL CLEAN RUN — back to the number we started from"
RC=$(lint_repo "$L/run-final.json")
FIN_E=$(errors_in "$L/run-final.json"); FIN_W=$(warns_in "$L/run-final.json"); FIN_F=$(files_in "$L/run-final.json")
echo "npm run lint  -> exit $RC   files $FIN_F   errors $FIN_E   warnings $FIN_W"
eq "errors back to the baseline"   "$CLEAN_E" "$FIN_E"
eq "warnings back to the baseline" "$CLEAN_W" "$FIN_W"
eq "files back to the baseline"    "$CLEAN_F" "$FIN_F"
eq "working tree carries only this lane's three intended files" \
   " M README.md
 M package.json
?? .eslintignore" "$( cd "$W" && git status --porcelain | LC_ALL=C sort )"

say "RESULT"
echo "failed assertions: $FAILURES"
[ "$FAILURES" -eq 0 ] || exit 1
