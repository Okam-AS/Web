#!/usr/bin/env python3
"""Mutation receipt for test/login-modal-failed-send.test.js.

A passing test proves nothing about whether it could fail. Each mutant below breaks ONE thing the
suite claims to pin; the suite must red, and it must red on the NAMED tests rather than merely
somewhere. Two guards keep this from crediting itself:

  1. A mutant whose search string is not found EXACTLY ONCE aborts the run. A substitution that
     silently did nothing would otherwise be scored as "test survived", which is the same false
     green this lane exists to remove.
  2. The baseline is run first and must be fully green, so a mutant's red cannot be inherited.

Run from anywhere:  python3 mutate.py
"""

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

WT = Path("/Users/svendaneel/okam/web-loginsend")
LANE = Path("/Users/svendaneel/okam/Web-modules/lanes/L-LOGIN-MODAL-REPORTS-A-FAILED-SEND")
TEST = "test/login-modal-failed-send.test.js"

MODAL = WT / "components/molecules/LoginModal.vue"
REQSVC = WT / "core/services/request-service.ts"
USRSVC = WT / "core/services/user-service.ts"

ORIGINAL_GETCODE_BODY = """        .then((sent) => {
          if (sent) {
            this.smsSent = true;
          } else {
            this.errorMessage = SEND_FAILED;
          }
        })"""

MUTANTS = [
    (
        "M1 the original defect restored: advance from a .then() that ignores its value",
        MODAL,
        ORIGINAL_GETCODE_BODY,
        """        .then(() => {
          this.smsSent = true;
        })""",
        ["A", "B", "C"],
    ),
    (
        "M2 the guard is always true: advance whatever the send returned",
        MODAL,
        "          if (sent) {",
        "          if (true) {",
        ["A", "B"],
    ),
    (
        "M3 the failure is silent: do not advance, but say nothing either",
        MODAL,
        """          } else {
            this.errorMessage = SEND_FAILED;
          }""",
        """          } else {
            // mutant: says nothing
          }""",
        ["A", "B"],
    ),
    (
        "M4 the message claims a wrong number again, which a false cannot know",
        MODAL,
        'export const SEND_FAILED = "Vi kunne ikke sende koden. Sjekk nummeret, eller prøv igjen om litt.";',
        'export const SEND_FAILED = "Feil telefonnummer";',
        ["A", "B", "C", "F"],
    ),
    (
        "M5 the guard is inverted: a code that WAS sent no longer opens the boxes",
        MODAL,
        "          if (sent) {",
        "          if (!sent) {",
        ["A", "B", "D"],
    ),
    (
        "M6 the loading flag is never cleared, so the modal stays stuck",
        MODAL,
        """        .finally(() => {
          this.isLoading = false;
        });
    },
    login(code) {""",
        """        ;
    },
    login(code) {""",
        ["E"],
    ),
    (
        "M7 PostRequest rejects instead of resolving — the premise itself changes",
        REQSVC,
        """    return this._httpModule.httpClient(request).then((response) => {
      return response;
    }).catch((error) => {
      return error;
    });
  }

  public PutRequest""",
        """    return this._httpModule.httpClient(request).then((response) => {
      return response;
    });
  }

  public PutRequest""",
        ["PREMISE"],
    ),
    (
        "M8 SendVerificationToken always claims success",
        USRSVC,
        "    return this._requestService.TryParseResponse(response) === true;",
        "    return true;",
        ["PREMISE", "A"],
    ),
    # Added AFTER the first eight all came back killed. Eight-for-eight is a reason to look harder,
    # not to stop: the first eight were all written against the branch this lane changed, so their
    # dying proves that branch is pinned and says nothing about the line above it. `getCode` also
    # CLEARS the previous error before each attempt, and nothing above tried a second attempt — so a
    # stale «we could not send the code» could survive onto a send that actually worked.
    (
        "M9 the previous error is never cleared, so a stale failure survives a retry",
        MODAL,
        """    getCode() {
      this.errorMessage = "";
      this.isLoading = true;""",
        """    getCode() {
      this.isLoading = true;""",
        ["G"],
    ),
]


def run_jest():
    proc = subprocess.run(
        ["npx", "jest", TEST, "--coverage=false", "--json"],
        cwd=WT, capture_output=True, text=True,
    )
    blob = re.search(r"\{.*\}", proc.stdout or "", re.S)
    if not blob:
        return None, (proc.stdout or "") + (proc.stderr or "")
    data = json.loads(blob.group(0))
    results = {}
    for suite in data.get("testResults", []):
        for case in suite.get("assertionResults", []):
            results[case["fullName"]] = case["status"]
    return results, ""


def label_of(full_name):
    """Map a jest test name back to the short letter this receipt talks about."""
    m = re.search(r"\b([A-G]):", full_name)
    if m:
        return m.group(1)
    if "PREMISE" in full_name:
        return "PREMISE"
    return "?"


def failing_labels(results):
    return sorted({label_of(n) for n, s in results.items() if s == "failed"})


def main():
    backups = {p: p.read_text() for p in {MODAL, REQSVC, USRSVC}}
    lines = []

    def emit(s):
        print(s)
        lines.append(s)

    try:
        emit("BASELINE (no mutation) — every mutant's red must be earned, not inherited")
        base, err = run_jest()
        if base is None:
            emit("  ABORT: jest produced no parsable result\n" + err[-3000:])
            return 1
        base_failed = failing_labels(base)
        emit("  %d test(s), %d failing %s" % (len(base), len(base_failed), base_failed or ""))
        if base_failed:
            emit("  ABORT: baseline is not green; a mutant's red would be meaningless")
            return 1
        emit("")

        survivors = []
        for name, path, old, new, expected in MUTANTS:
            src = backups[path]
            occurrences = src.count(old)
            if occurrences != 1:
                emit("%s\n  ABORT: search string found %d times in %s (expected exactly 1)"
                     % (name, occurrences, path.name))
                return 1

            path.write_text(src.replace(old, new))
            try:
                res, err = run_jest()
            finally:
                path.write_text(src)

            if res is None:
                # A mutant that stops the suite compiling still kills it, but say so plainly.
                emit("%s\n  KILLED (suite could not run at all)" % name)
                continue

            got = failing_labels(res)
            missed = [e for e in expected if e not in got]
            status = "KILLED" if got else "SURVIVED"
            emit("%s\n  %s — reds: %s | expected at least: %s%s"
                 % (name, status, got or "(none)", expected,
                    "" if not missed else " | MISSED: %s" % missed))
            if not got:
                survivors.append(name)

        emit("")
        emit("SURVIVORS: %s" % (survivors if survivors else "none — every mutant was killed"))
    finally:
        for p, text in backups.items():
            p.write_text(text)

    (LANE / "runs" / "mutation-receipt.txt").write_text("\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
