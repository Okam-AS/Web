#!/bin/zsh
# The defect and the census, through the REAL CLI, against a throwaway copy of
# docs/plan under this lane directory.  The real board is never named.
set -u
export PLAN_ACTOR=agent:L-BUILT-IS-CHECKED-TOO
REPO=/Users/svendaneel/okam/Web-modules
LANE="${REPO}/lanes/L-BUILT-IS-CHECKED-TOO"
SB="${LANE}/sandbox/plan"

rm -rf "${LANE}/sandbox"
mkdir -p "${LANE}/sandbox"
cp -R "${REPO}/docs/plan" "${SB}"

print "### the copy this proof runs against"
shasum -a 256 "${SB}/plan.md" "${REPO}/docs/plan/plan.md"

print "\n### PROOF 1 — cmd_built takes a sentence no checker would ever admit"
plan --dir "${SB}" built L-BUILT-IS-CHECKED-TOO \
  --evidence "I looked at it and it seemed fine; no file was written"
print "rc=$?"

print "\n### PROOF 2 — the identical string at verify, which does call the checker"
plan --dir "${SB}" verify L-BUILT-IS-CHECKED-TOO \
  --evidence "I looked at it and it seemed fine; no file was written"
print "rc=$?"

print "\n### PROOF 3 — one row per repair class, predicate vs real CLI"
python3 - <<'PY'
import json, subprocess
SB = "/Users/svendaneel/okam/Web-modules/lanes/L-BUILT-IS-CHECKED-TOO/sandbox/plan"
rows = {r["id"]: r for r in json.load(open(
    "/Users/svendaneel/okam/Web-modules/lanes/"
    "L-BUILT-IS-CHECKED-TOO/repair-grid.json"))}
picks = ["L-ABSENCE-AUDIT-CONDITIONS", "L-COLLECTED-PATHS",
         "L-ARTIFACT-NAMES-ITS-MODULE-TREE", "L-WF-PUNCH-UI",
         "L-ESCPOS-LADDER-NAMES-THE-TENDER", "L-CONSENT-REASON-VOCABULARY",
         "L-COERCION-WRITE-PATHS", "L-FRAGILE-NEEDLES", "L-WF-ADJUST-ADDRESS"]
agree = 0
for i in picks:
    r = rows[i]
    o = subprocess.run(["plan", "--dir", SB, "verify", i,
                        "--evidence", r["evidence"]],
                       capture_output=True, text=True)
    pred = "ADMIT" if r["admissible"] else "REFUSE"
    cli = "ADMIT" if o.returncode == 0 else "REFUSE"
    agree += pred == cli
    print("%-4s %-34s predicate=%-6s cli(rc=%d)=%-6s %s"
          % (r["repair"][:2], i, pred, o.returncode, cli,
             "OK" if pred == cli else "!! DISAGREE"))
    print("        " + (o.stdout + o.stderr).strip().replace("\n", " ")[:150])
print("\npredicate/CLI agreement: %d/%d" % (agree, len(picks)))
PY

print "\n### the real board is byte-identical afterwards"
shasum -a 256 "${REPO}/docs/plan/plan.md"
