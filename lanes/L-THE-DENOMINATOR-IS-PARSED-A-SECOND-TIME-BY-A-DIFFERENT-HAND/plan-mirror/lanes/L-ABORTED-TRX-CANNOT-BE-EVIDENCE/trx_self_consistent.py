#!/usr/bin/env python3
"""trx_self_consistent — refuse a .trx whose ResultSummary contradicts its Counters.

A trx cited as evidence is asked one question here, and it is answered from the
trx alone: **does the run's own verdict agree with the run's own tally?**

    <ResultSummary outcome="Failed">
      <Counters ... failed="0" error="0" aborted="0" ... />

is a contradiction.  Nothing failed, yet the run says it failed — the signature
of a run that was *aborted*, not one that failed a test.  A tally of 962 rows
from a tree of ~4,400 then reads like a scoped run instead of a corpse.

The converse must survive.  A run that reads `outcome="Failed"` with
`failed="1"` is internally consistent: it is honestly red, not aborted.  It is
not a pass either, so it is reported RED — but it is never REFUSED, because
refusing it would punish the only lane that declared its own failure.

Verdicts
    PASS    outcome is green and no adverse counter is set.
    RED     outcome is not green and an adverse counter says why.  Consistent,
            admissible only if the citation discloses it (see --disclosure).
    REFUSE  the artifact contradicts itself, or names its own abort, or cannot
            be read.  Inadmissible as evidence of anything.

Exit codes  0 every input PASS · 1 any REFUSE · 2 any RED but no REFUSE
            (so the check is non-green — "reds" — on both Failed artifacts,
            and refuses only the one that lies about why.)

Read-only.  Never runs a suite, never opens a container, never writes outside
the path given to --json.  One bounded tail read per file (ResultSummary sits
within ~16 KB of EOF in every trx measured in this estate; the window escalates
to the whole file if it is not there).
"""

import os
import re
import sys
import json

# --------------------------------------------------------------------------
# 1. Vocabulary
# --------------------------------------------------------------------------

# ResultSummary/@outcome values that assert the run finished clean.
GREEN_OUTCOMES = {"Completed", "Passed"}

# Counters that, if non-zero, are a *cause* for a non-green outcome.
# notExecuted (skips) and inconclusive are deliberately NOT adverse: a run may
# skip tests and still be a clean pass, and every green trx in this estate has
# total > executed for exactly that reason.
ADVERSE = ("failed", "error", "timeout", "aborted",
           "passedButRunAborted", "notRunnable", "disconnected")

# The runner's own words for "this run did not finish".  Matched only inside a
# RunInfo whose outcome is Error/Aborted, never against suite stdout, so a test
# that merely prints the phrase cannot trip it.
ABORT_MARKERS = (
    "the active test run was aborted",
    "test host process crashed",
    "test run aborted",
)

RESULTSUMMARY_RE = re.compile(r'<ResultSummary\b[^>]*\boutcome="([^"]*)"')
COUNTERS_RE = re.compile(r'<Counters\b([^>]*?)/?>')
ATTR_RE = re.compile(r'(\w+)="([^"]*)"')
RUNINFO_RE = re.compile(r'<RunInfo\b([^>]*)>(.*?)</RunInfo>', re.S)
TAG_RE = re.compile(r'<[^>]*>')


# --------------------------------------------------------------------------
# 2. One bounded read
# --------------------------------------------------------------------------

def read_summary(path):
    """Return (text-from-<ResultSummary>-to-EOF, bytes_read) or (None, n)."""
    size = os.path.getsize(path)
    win = 65536
    while True:
        start = max(0, size - win)
        with open(path, "rb") as fh:
            fh.seek(start)
            buf = fh.read()
        txt = buf.decode("utf-8", "replace")
        i = txt.rfind("<ResultSummary")
        # i == 0 with start > 0 may be a tag clipped by the window edge; widen.
        if i > 0 or (i == 0 and start == 0):
            return txt[i:], len(buf)
        if start == 0:
            return None, len(buf)
        win *= 8


# --------------------------------------------------------------------------
# 3. The judgement
# --------------------------------------------------------------------------

def judge(path):
    rec = {"path": path, "verdict": "REFUSE", "reasons": [], "outcome": None,
           "counters": {}, "adverse": None, "abort_marker": None,
           "as_trx_extractor_reads_it": None}

    try:
        if os.path.getsize(path) == 0:
            rec["reasons"].append("empty file")
            return rec
        seg, _ = read_summary(path)
    except (IOError, OSError) as exc:
        rec["reasons"].append("unreadable: %s" % exc.__class__.__name__)
        return rec

    if seg is None:
        rec["reasons"].append("no <ResultSummary> — truncated or not a trx")
        return rec

    m = RESULTSUMMARY_RE.search(seg)
    if not m:
        rec["reasons"].append("<ResultSummary> carries no outcome attribute")
        return rec
    outcome = m.group(1)
    rec["outcome"] = outcome

    mc = COUNTERS_RE.search(seg)
    if not mc:
        rec["reasons"].append("no <Counters> — nothing to check the outcome against")
        return rec
    counters = {}
    for k, v in ATTR_RE.findall(mc.group(1)):
        try:
            counters[k] = int(v)
        except ValueError:
            pass
    if "total" not in counters or "executed" not in counters:
        rec["reasons"].append("<Counters> missing total/executed")
        return rec
    rec["counters"] = counters

    adverse = sum(counters.get(k, 0) for k in ADVERSE)
    rec["adverse"] = adverse
    green_outcome = outcome in GREEN_OUTCOMES

    # What the plan tool's built-in `trx` extractor makes of the same file —
    # it reads Counters only, so it cannot see the outcome at all.
    rec["as_trx_extractor_reads_it"] = "%d passed / %d failed" % (
        counters.get("passed", 0), counters.get("failed", 0))

    # -- R1/R2: the outcome and the tally must agree, in both directions ----
    if not green_outcome and adverse == 0:
        rec["reasons"].append(
            'outcome="%s" with every adverse counter at 0 (%s) — a verdict with '
            "no cause in its own tally; the signature of an aborted run"
            % (outcome, ", ".join("%s=0" % k for k in ADVERSE)))
    if green_outcome and adverse > 0:
        rec["reasons"].append(
            'outcome="%s" while the tally records %d adverse result(s) (%s) — a '
            "clean verdict over a tally that is not clean"
            % (outcome, adverse,
               ", ".join("%s=%d" % (k, counters[k]) for k in ADVERSE
                         if counters.get(k, 0) > 0)))

    # -- R3: the counters identity ----------------------------------------
    # executed == passed + everything adverse that was actually executed.
    # (aborted/notRunnable/disconnected are not "executed", so they are
    # excluded from the identity; failed/error/timeout are.)
    ident = (counters.get("passed", 0) + counters.get("failed", 0)
             + counters.get("error", 0) + counters.get("timeout", 0)
             + counters.get("inconclusive", 0))
    if counters["executed"] != ident:
        rec["reasons"].append(
            "executed=%d but passed+failed+error+timeout+inconclusive=%d — the "
            "tally does not add up to itself"
            % (counters["executed"], ident))

    # -- R4: the run names its own abort, whatever the counters say --------
    # Independent of R1: an abort that lands *after* a recorded failure leaves
    # outcome and counters agreeing, and only this clause can see it.
    for mi in RUNINFO_RE.finditer(seg):
        attrs = dict(ATTR_RE.findall(mi.group(1)))
        if attrs.get("outcome") not in ("Error", "Aborted"):
            continue
        text = TAG_RE.sub(" ", mi.group(2))
        low = " ".join(text.split()).lower()
        for marker in ABORT_MARKERS:
            if marker in low:
                rec["abort_marker"] = marker
                rec["reasons"].append(
                    'RunInfo outcome="%s" states "%s" — the run declares it did '
                    "not finish" % (attrs.get("outcome"), marker))
                break
        if rec["abort_marker"]:
            break

    if rec["reasons"]:
        rec["verdict"] = "REFUSE"
    elif green_outcome:
        rec["verdict"] = "PASS"
    else:
        rec["verdict"] = "RED"
        rec["reasons"].append(
            'outcome="%s" with %d adverse result(s) — internally consistent, so '
            "not refused; it is honestly red and is not a pass" % (outcome, adverse))
    return rec


# --------------------------------------------------------------------------
# 4. Disclosure (reported, never the reason for a refusal)
# --------------------------------------------------------------------------

# Word-bounded on purpose.  A substring test matches "measu-red" inside
# "measured myself", which is how the first version of this function accepted
# a citation for the wrong reason.
DISCLOSURE_RE = re.compile(
    r"\b(fail|fails|failed|failing|failure|failures|red|known-red|abort|"
    r"aborts|aborted|crash|crashed|partial|incomplete)\b", re.I)


def discloses(citation, failed_count):
    """Does the text that cites a non-green trx admit that it is non-green?

    Two ways to admit it: name the failure count in a counts run (the
    `4419/4406/1/12` form this plan uses) — checked first, because it is the
    unambiguous one — or say so in words."""
    if not citation:
        return False, "no citation text"
    for quad in re.findall(r"\b\d+(?:/\d+){2,3}\b", citation):
        parts = [int(x) for x in quad.split("/")]
        if len(parts) >= 3 and parts[2] == failed_count and failed_count > 0:
            return True, "citation carries the counts run %s (failed=%d)" % (
                quad, failed_count)
    m = DISCLOSURE_RE.search(citation)
    if m:
        return True, "citation says %r" % m.group(0)
    return False, "citation names the artifact and no non-green fact about it"


# --------------------------------------------------------------------------
# 5. Drivers
# --------------------------------------------------------------------------

SUMMARY = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "summary.json")


def write_summary(records, undisclosed):
    """Scalar counts only — the plan tool's json: extractor refuses a dict or a
    list, so every value here is a number or a string."""
    import time
    doc = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "cited": len(records),
        "pass": sum(1 for r in records if r["verdict"] == "PASS"),
        "red": sum(1 for r in records if r["verdict"] == "RED"),
        "refuse": sum(1 for r in records if r["verdict"] == "REFUSE"),
        "red_undisclosed": undisclosed,
        "refused_artifacts": " ".join(
            sorted(r["cited_by"] for r in records if r["verdict"] == "REFUSE")),
    }
    with open(SUMMARY, "w") as fh:
        json.dump(doc, fh, indent=1)
    return doc


def exit_code(records):
    if any(r["verdict"] == "REFUSE" for r in records):
        return 1
    if any(r["verdict"] == "RED" for r in records):
        return 2
    return 0


def emit(records, verbose=True):
    width = max([len(os.path.basename(r["path"])) for r in records] + [12])
    for r in records:
        c = r["counters"]
        line = "%-7s %-*s outcome=%-10s total=%-6s exec=%-6s pass=%-6s adverse=%s" % (
            r["verdict"], width, os.path.basename(r["path"]),
            r["outcome"] or "-", c.get("total", "-"), c.get("executed", "-"),
            c.get("passed", "-"),
            "-" if r["adverse"] is None else r["adverse"])
        print(line)
        if verbose and r["verdict"] != "PASS":
            for reason in r["reasons"]:
                print("            %s" % reason)
            print("            path: %s" % r["path"])
    n = len(records)
    print("\n%d artifact(s): %d PASS, %d RED, %d REFUSE" % (
        n,
        sum(1 for r in records if r["verdict"] == "PASS"),
        sum(1 for r in records if r["verdict"] == "RED"),
        sum(1 for r in records if r["verdict"] == "REFUSE")))


CITED_JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "..", "L-TRX-CONTAINS-WHAT-IT-CLAIMS", "lanes.json")


def cited_paths():
    """The 25 trx this plan's evidence lines name, as derived by the sibling
    lane L-TRX-CONTAINS-WHAT-IT-CLAIMS.  Not re-derived here."""
    out = []
    for lane, entries in json.load(open(CITED_JSON)):
        for label, sha, trx in entries:
            out.append((lane, label, trx))
    return out


FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def sweep(root, include_fixtures=False):
    """Every .trx under root.  The check's own synthetic fixtures are skipped
    by default — they are deliberately malformed and would otherwise be
    reported as estate findings."""
    hits = []
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
        if not include_fixtures and os.path.abspath(dirpath) == FIXTURES:
            continue
        for f in files:
            if f.endswith(".trx"):
                hits.append(os.path.join(dirpath, f))
    return sorted(hits)


PLAN_MD = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "..", "plan.md")


def evidence_line(lane_id, plan_md=PLAN_MD):
    """The `evidence:` line of a lane's own entity block in plan.md."""
    inside = False
    try:
        fh = open(plan_md, encoding="utf-8", errors="replace")
    except IOError:
        return None
    with fh:
        for line in fh:
            if line.startswith("### "):
                inside = line.startswith("### Lane %s " % lane_id) or \
                    line.rstrip() == "### Lane %s" % lane_id
                continue
            if inside and line.startswith("evidence:"):
                return line[len("evidence:"):].strip()
    return None


def main(argv):
    args = list(argv[1:])
    as_json = None
    if "--json" in args:
        i = args.index("--json")
        as_json = args[i + 1]
        del args[i:i + 2]

    if args and args[0] == "--selftest":
        import selftest
        return selftest.run(judge)

    if args and args[0] == "--cited":
        records = []
        undisclosed = 0
        for lane, label, trx in cited_paths():
            r = judge(trx)
            r["cited_by"] = lane
            r["label"] = label
            if r["verdict"] != "PASS":
                ok, why = discloses(evidence_line(lane),
                                    r["counters"].get("failed", 0))
                r["disclosed"] = ok
                r["disclosure_reason"] = why
                undisclosed += 0 if ok else 1
            records.append(r)
        # Scalar counts the plan tool's `json:` extractor can read as facts.
        # See PROBES.md in this directory for the exact probe lines.
        write_summary(records, undisclosed)
        emit(records)
        print("\ncited by a plan evidence line: %d trx across %d lanes"
              % (len(records), len(set(r["cited_by"] for r in records))))
        for r in records:
            if r["verdict"] != "PASS":
                print("  %-7s %s  <- %s" % (r["verdict"], r["path"], r["cited_by"]))
        if as_json:
            json.dump(records, open(as_json, "w"), indent=1)
        return exit_code(records)

    if args and args[0] == "--disclosure":
        # Second stage, reported and never the reason for a refusal: for every
        # cited trx that is not green, does the evidence line citing it admit
        # that it is not green?  This is what separates the silent receipt from
        # the declared one — the trx-internal check separates abort from red.
        rc = 0
        for lane, label, trx in cited_paths():
            r = judge(trx)
            if r["verdict"] == "PASS":
                continue
            cite = evidence_line(lane)
            ok, why = discloses(cite, r["counters"].get("failed", 0))
            print("%-7s %-26s %s" % (r["verdict"], lane,
                                     "DISCLOSED" if ok else "UNDISCLOSED"))
            print("        %s" % why)
            print("        %s" % os.path.basename(trx))
            if not ok:
                rc = 1
        return rc

    if args and args[0] == "--sweep":
        root = args[1] if len(args) > 1 else os.getcwd()
        paths = sweep(root)
        records = [judge(p) for p in paths]
        bad = [r for r in records if r["verdict"] != "PASS"]
        print("swept %d trx under %s" % (len(records), root))
        print("PASS %d · RED %d · REFUSE %d" % (
            sum(1 for r in records if r["verdict"] == "PASS"),
            sum(1 for r in records if r["verdict"] == "RED"),
            sum(1 for r in records if r["verdict"] == "REFUSE")))
        emit(bad) if bad else print("no non-green artifact found")
        if as_json:
            json.dump(records, open(as_json, "w"), indent=1)
        return exit_code(records)

    if not args:
        print(__doc__)
        print("usage: trx_self_consistent.py [--json OUT] "
              "(PATH... | --cited | --sweep DIR | --selftest)")
        return 3

    records = [judge(p) for p in args]
    emit(records)
    if as_json:
        json.dump(records, open(as_json, "w"), indent=1)
    return exit_code(records)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
