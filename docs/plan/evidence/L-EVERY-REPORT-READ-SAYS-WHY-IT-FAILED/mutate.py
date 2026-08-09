#!/usr/bin/env python3
"""Mutation receipt for L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED.

The change spans TWO repositories — `core/` is a git submodule (Okam-AS/Core.git) — so the
mutations below target files in both and the driver restores both. A mutation whose search string
is not found aborts the run: a no-op mutation is indistinguishable from a test that cannot fail.

Usage:  python3 lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/mutate.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ["test/statistics-service-failure-reasons.test.js", "test/growth-poweruser-page.test.js"]

STATS = "core/services/statistics-service.ts"      # submodule
REQ = "core/services/request-service.ts"           # submodule
PAGE = "pages/admin/poweruser-growth.vue"          # this repo

# (label, file, find, replace)
MUTATIONS = [
    # ---- the submodule: the read itself ---------------------------------------------------------
    ("core: the platform-growth read goes back to the unsafe GetRequest", STATS,
     "await this._requestService.SafeGetRequest('/statistics/platform-growth')",
     "await this._requestService.GetRequest('/statistics/platform-growth')"),

    # ---- the submodule: each read stops naming the reason ----------------------------------------
    ("core: Get throws its own sentence again", STATS,
     "throw this._requestService.BuildError('Failed to get statistics', response)",
     "throw new Error('Failed to get statistics')"),
    ("core: GetPendingSettlements throws its own sentence again", STATS,
     "throw this._requestService.BuildError('Failed to get pending settlements', response)",
     "throw new Error('Failed to get pending settlements')"),
    ("core: GetWoltDriveInvoice throws its own sentence again", STATS,
     "throw this._requestService.BuildError('Failed to get wolt drive invoice', response)",
     "throw new Error('Failed to get wolt drive invoice')"),
    ("core: GetHeatmapData throws its own sentence again", STATS,
     "throw this._requestService.BuildError('Failed to get heatmap data', response)",
     "throw new Error('Failed to get heatmap data')"),
    ("core: GetPlatformGrowth throws its own sentence again", STATS,
     "throw this._requestService.BuildError('Failed to get platform growth', response)",
     "throw new Error('Failed to get platform growth')"),

    # ---- the submodule: BuildError itself ---------------------------------------------------------
    ("core: BuildError stops preferring the backend's reason", REQ,
     "const error: any = new Error(backendMessage || message);",
     "const error: any = new Error(message);"),
    ("core: BuildError stops attaching the status", REQ,
     "error.statusCode = this.TryGetStatusCode(responseOrError);",
     "error.statusCode = undefined;"),
    ("core: BuildError stops recording where the message came from", REQ,
     "error.hasBackendMessage = Boolean(backendMessage);",
     "error.hasBackendMessage = false;"),

    # ---- this repo: the page's copy ----------------------------------------------------------------
    ("page: the raw error message is printed again", PAGE,
     "this.errorMessage = this.describeLoadFailure(error);",
     "this.errorMessage = error?.message || this.$i('poweruserGrowth_unknownError');"),
    ("page: a backend reason is no longer preferred", PAGE,
     "if (error?.hasBackendMessage && error.message) return error.message;",
     ""),
    ("page: an expired session loses its own sentence", PAGE,
     "if (status === 401) return this.$i('poweruserGrowth_errorSessionExpired');",
     ""),
    ("page: a refusal loses its own sentence", PAGE,
     "if (status === 403) return this.$i('poweruserGrowth_errorNotAllowed');",
     ""),
    ("page: being offline loses its own sentence", PAGE,
     "if (status === undefined || status === null) return this.$i('poweruserGrowth_errorOffline');",
     ""),
    ("page: a server error loses its own sentence", PAGE,
     "return this.$i('poweruserGrowth_errorServer', { status });",
     "return this.$i('poweruserGrowth_unknownError');"),
    ("page: an unrecognised throw is dressed up as a transport failure", PAGE,
     "      if (!error || !('hasBackendMessage' in error)) {\n        return error?.message || this.$i('poweruserGrowth_unknownError');\n      }\n",
     ""),
    ("page: 401 and 403 are collapsed into one sentence", PAGE,
     "if (status === 403) return this.$i('poweruserGrowth_errorNotAllowed');",
     "if (status === 403) return this.$i('poweruserGrowth_errorSessionExpired');"),

    # Pins the happy-path control arms. Without a mutation that breaks a GOOD response, "still
    # resolves a good response" would be an arm nothing could falsify, and the failure arms above
    # would be consistent with a service that simply throws at everything.
    ("core: a 200 stops being treated as success", REQ,
     "if (statusCode === 200) {",
     "if (statusCode === 999) {"),
]

# The arms this lane is responsible for. The other 38 belong to
# L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED and carry their own receipt; counting them here would let
# this lane's mutations look weak against arms they were never meant to touch.
PAGE_ARMS_IN_SCOPE = {
    "an expired session reaches the operator as the reason the backend gave",
    "a refusal reaches the operator as the reason the backend gave",
    "a crashed report engine reaches the operator as the reason the backend gave",
    "an expired session with an empty body is still named, not reduced to a code",
    "a refusal with an empty body is still named, not reduced to a code",
    "a crashed report engine with an empty body names the code it answered with",
    "being offline is told apart from the server refusing",
    "the four failures do not read alike",
    # Pre-existing arms whose code path this lane rewrote, so they are this lane's to keep honest.
    "a failed read is said out loud instead of leaving an empty page",
    "a failure that carries no message at all still says something",
}


def run_tests(files=None):
    proc = subprocess.run(["npx", "jest", *(files or TESTS), "--coverage=false", "--verbose"],
                          cwd=ROOT, capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    passed, failed = set(), set()
    for line in out.splitlines():
        s = line.strip()
        m = re.match(r"^[✓√]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            passed.add(m.group(1).strip()); continue
        m = re.match(r"^[✕×]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            failed.add(m.group(1).strip())
    return passed, failed


def main():
    originals = {p: (ROOT / p).read_text() for p in {STATS, REQ, PAGE}}

    print("=== baseline (unmutated, both repos) ===")
    base_pass, base_fail = run_tests()
    print(f"  green {len(base_pass)}  red {len(base_fail)}")
    if base_fail:
        print("!! the baseline is not green — aborting", file=sys.stderr)
        for n in sorted(base_fail):
            print(f"   RED: {n}", file=sys.stderr)
        return 1

    # Arms of the service test file, derived by running it alone rather than listed by hand, so a
    # new arm added there is covered by this receipt without anyone remembering to add it.
    service_arms, _ = run_tests([TESTS[0]])
    in_scope = (service_arms | PAGE_ARMS_IN_SCOPE) & base_pass
    missing = PAGE_ARMS_IN_SCOPE - base_pass
    if missing:
        print(f"!! named page arms not found in the run: {sorted(missing)}", file=sys.stderr)
        return 1
    print(f"  arms in this lane's scope: {len(in_scope)} "
          f"({len(service_arms)} service + {len(PAGE_ARMS_IN_SCOPE)} page)")
    print(f"  arms belonging to the prior lane, not counted here: {len(base_pass - in_scope)}")

    killable = set(in_scope)
    killed_by = {name: [] for name in killable}
    out_of_scope = base_pass - in_scope
    collateral = set()

    for label, rel, find, replace in MUTATIONS:
        path = ROOT / rel
        original = originals[rel]
        if find not in original:
            print(f"!! mutation search string not found: {label}", file=sys.stderr)
            for p, t in originals.items():
                (ROOT / p).write_text(t)
            return 1
        path.write_text(original.replace(find, replace, 1))
        try:
            _, failed = run_tests()
        finally:
            path.write_text(original)          # ALWAYS restored
        newly = sorted(failed & killable)
        spill = failed & out_of_scope
        collateral |= spill
        print(f"\n-- {label}\n   reds {len(newly)} in scope"
              + (f" (+{len(spill)} in the prior lane's arms)" if spill else "")
              + ": " + ("; ".join(newly) if newly else "NONE"))
        for name in newly:
            killed_by[name].append(label)

    for p, t in originals.items():
        assert (ROOT / p).read_text() == t, f"{p} was not restored"

    survivors = [n for n, m in killed_by.items() if not m]
    unused = [m[0] for m in MUTATIONS if not any(m[0] in v for v in killed_by.values())]
    print("\n=== receipt ===")
    print(f"arms in this lane's scope        : {len(killable)}")
    print(f"arms red under >=1 mutation      : {len(killable) - len(survivors)}")
    print(f"arms no mutation could break     : {len(survivors)}")
    print(f"mutations applied                : {len(MUTATIONS)}")
    print(f"mutations that killed nothing    : {len(unused)}")
    for n in survivors:
        print(f"   SURVIVOR: {n}")
    for m in unused:
        print(f"   KILLED NOTHING: {m}")
    print(f"prior-lane arms disturbed by these mutations: {len(collateral)}")

    (Path(__file__).parent / "mutation-receipt.json").write_text(
        json.dumps({"killed_by": killed_by, "survivors": survivors, "unused_mutations": unused,
                    "collateral_prior_lane_arms": sorted(collateral),
                    "mutations": [m[0] for m in MUTATIONS]}, indent=1, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
