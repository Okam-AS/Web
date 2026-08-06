#!/bin/zsh
# The guard shown REFUSING and shown ADMITTING, through the real CLI.
# Everything runs against a throwaway copy of docs/plan under this lane dir
# (`--dir`), so no verb here can touch the shared plan; find_repo_root still
# walks up to the git root, so repo-relative evidence paths resolve normally.
#
#   lanes/L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED/cli-proof.sh > cli-proof.txt 2>&1
set -u
export PLAN_ACTOR=agent:L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED
ROOT=/Users/svendaneel/okam/Web-modules
L=$ROOT/lanes/L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED
S=$L/sandbox-plan
rm -rf $S; cp -R $ROOT/docs/plan $S

run() {  # run <label> <expect-rc> -- plan args...
  local label=$1 want=$2; shift 3
  local out; out=$(plan "$@" --dir $S 2>&1); local rc=$?
  printf '%-4s rc=%-2s (want %s)  %s\n' "$([ $rc -eq $want ] && echo ' OK ' || echo 'BAD ')" \
         "$rc" "$want" "$label"
  printf '        %s\n' "$out"
}

print "######## NEGATIVE — the six admissions the census listed, asked of FT-MEALS"
print "######## rc 6 = EX_EVIDENCE.  Before this repair every one of them was rc 0."
for EV in artifacts artifacts/ artifacts/journeys/ \
          artifacts/journeys/modal-scroll-lock.playwright.json \
          artifacts/journeys/growth-newsletter-send-gate.playwright.json \
          artifacts/journeys/training-course-to-evidence.playwright.json; do
  run "verify FT-MEALS --evidence $EV" 6 -- verify FT-MEALS --evidence $EV
done

print "\n######## the six refusals mutated nothing"
if diff -q $S/plan.md $ROOT/docs/plan/plan.md >/dev/null; then
  print " OK  sandbox plan.md still identical to the real one"
else
  print "BAD  sandbox plan.md diverged"
fi

print "\n######## POSITIVE — a guard that refuses everything is not a guard"
run "verify L-LINT-RUNNABLE (prose artifact its exit names, absolute spelling)" 0 -- \
    verify L-LINT-RUNNABLE --evidence $ROOT/lanes/L-LINT-RUNNABLE/run.md
run "unverify L-JOURNEY-MARGIN" 0 -- \
    unverify L-JOURNEY-MARGIN --reason "sandbox round-trip, L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED"
run "verify L-JOURNEY-MARGIN (JSON run record reading status: passed)" 0 -- \
    verify L-JOURNEY-MARGIN --evidence artifacts/journeys/margin-supplier-to-plate.playwright.json

print "\n######## POSITIVE — THE DELIBERATE RED.  guard-proof.txt says 'failed' nine"
print "######## times; every one is an arm's SUBJECT, none is the run's OUTCOME."
run "unverify L-JOURNEY-PROXY-BLINDSPOT" 0 -- \
    unverify L-JOURNEY-PROXY-BLINDSPOT --reason "sandbox round-trip, L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED"
run "verify L-JOURNEY-PROXY-BLINDSPOT --evidence lanes/…/guard-proof.txt" 0 -- \
    verify L-JOURNEY-PROXY-BLINDSPOT --evidence lanes/L-JOURNEY-PROXY-BLINDSPOT/guard-proof.txt

print "\n######## NEGATIVE — the one materially false row cannot be put back"
run "unverify L-JOURNEY-COVERAGE-THREE" 0 -- \
    unverify L-JOURNEY-COVERAGE-THREE --reason "sandbox round-trip, L-EVIDENCE-IS-CHECKED-WHEN-CLAIMED"
run "re-verify on the directory it was verified against" 6 -- \
    verify L-JOURNEY-COVERAGE-THREE --evidence artifacts/journeys/
run "re-verify on the Training artifact its exit names" 6 -- \
    verify L-JOURNEY-COVERAGE-THREE --evidence artifacts/journeys/training-course-to-evidence.playwright.json
run "re-verify on the Margin artifact, which passed" 6 -- \
    verify L-JOURNEY-COVERAGE-THREE --evidence artifacts/journeys/margin-recipe-to-margin.playwright.json

print "\n######## the shared docs/plan was never opened for write by this script"
rm -rf $S
