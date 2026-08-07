#!/bin/sh
# The suite command the canonical mutation runner (test/support/mutate.js) drives via
# MUTATE_TEST_COMMAND. The runner is jest-shaped and this repository has no package.json, so the
# runner is rooted in its own frontend worktree and reaches the backend tree through `..`; this
# script is what turns its one argument — an xunit filter — into a backend tier run.
#
# It exists to make three failure modes IMPOSSIBLE to read as a mutation result:
#
#   BUILD  the mutated source did not compile. A non-zero exit here would otherwise be recorded as
#          "the test caught the mutation", which is a lie.
#   STALE  `dotnet build` printed 0 Error(s) without recompiling, so `--no-build` would measure the
#          PREVIOUS binary (CLAUDE.md). Asserted by WebApi.dll's mtime moving.
#   ZERO   the filter matched no tests. jest and vstest both exit 0 having run nothing, which is how
#          a sibling lane certified every mutation green against a suite that never ran.
#
# Every invocation appends one line to $MUTATE_COUNT_LOG; the caller asserts afterwards that each
# line carries the same non-zero total. Only a genuine test failure exits 1.
set -u

WT=/Users/svendaneel/okam/wt-gcxfer
DLL="$WT/bin/Debug/net8.0/WebApi.dll"
FILTER="$1"
LOG="${MUTATE_COUNT_LOG:-$WT/lane/suite-runs.log}"

mtime() { stat -f %m "$1" 2>/dev/null || echo 0; }

before=$(mtime "$DLL")
if ! (cd "$WT" && dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug) > "$WT/lane/last-build.log" 2>&1; then
  echo "BUILD filter=$FILTER" >> "$LOG"
  exit 9
fi
after=$(mtime "$DLL")
if [ "$before" = "$after" ]; then
  echo "STALE filter=$FILTER" >> "$LOG"
  exit 8
fi

out=$(cd "$WT/WebApi.Tests" && dotnet test --no-build -c Debug --filter "Database!=SqlServer&$FILTER" 2>&1)
rc=$?

summary=$(printf '%s\n' "$out" | grep -E '^(Passed!|Failed!)' | tail -1)
total=$(printf '%s\n' "$summary" | sed -n 's/.*Total: *\([0-9][0-9]*\).*/\1/p')
failed=$(printf '%s\n' "$summary" | sed -n 's/.*Failed: *\([0-9][0-9]*\).*/\1/p')
: "${total:=0}"
: "${failed:=0}"

if [ "$total" -eq 0 ]; then
  echo "ZERO filter=$FILTER rc=$rc" >> "$LOG"
  printf '%s\n' "$out" | tail -20
  exit 7
fi

names=$(printf '%s\n' "$out" | sed -n 's/.*\[xUnit.net[^]]*\] *\([A-Za-z0-9_.]*\) \[FAIL\].*/\1/p' | sed 's/.*\.//' | sort -u | tr '\n' ',')
echo "RUN total=$total failed=$failed rc=$rc reddened=[$names] filter=$FILTER" >> "$LOG"
printf '%s\n' "$summary"
exit $rc
