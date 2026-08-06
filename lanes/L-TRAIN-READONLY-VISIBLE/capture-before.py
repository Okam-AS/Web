#!/usr/bin/env python3
"""Photograph the switchboard as it was, WITHOUT reverting any file.

`translations/*.ts` carry five uncommitted hunks belonging to other lanes, so restoring them from
HEAD — even for the twenty seconds a probe takes — would put another lane's work at the mercy of this
process surviving. Instead the two edits this lane made to the rendered locale and the page are undone
by exact string replacement, the probe runs, and they are put straight back. Checksums are compared
before and after; a mismatch is a hard failure, not a warning.
"""
import hashlib
import os
import subprocess
import sys

ROOT = "/Users/svendaneel/okam/Web-modules/"
PAGE = ROOT + "pages/admin/feature-flags.vue"
NO = ROOT + "translations/no.ts"

# The template block whose absence IS the before state: with it gone the rows render exactly as they
# did at e34977ac, whatever else is left in the script block.
ROW_BLOCK = """            <!-- What OFF does to this module, for the flags where "off" does not mean "gone". Above
                 the control for the same reason the precondition is: it is read at the moment of the
                 click, by someone who may be mid-incident and expecting the module to disappear. -->
            <p
              v-if="offBehaviourKey(row)"
              class="ff-row__offmeaning"
              :data-off-meaning="row.flagKey"
            >
              {{ $i(offBehaviourKey(row)) }}
            </p>

"""

INTRO_NOW = "Alt er avslått som utgangspunkt. Hva «av» gjør med lesingen, er ikke likt fra modul til modul — noen fortsetter å vise det som allerede er registrert, andre blir helt borte — så les raden før du slår av."
INTRO_WAS = "Alt er avslått som utgangspunkt: en bryter som ikke står på, avviser skrivinger — lesing og eksport av det som allerede er registrert, fortsetter."

EDITS = [(PAGE, ROW_BLOCK, ""), (NO, INTRO_NOW, INTRO_WAS)]


def digest(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def read(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def main():
    saved = {path: read(path) for path, _, _ in EDITS}
    before = {path: digest(path) for path in saved}

    for path, old, new in EDITS:
        if old not in saved[path]:
            print("ANCHOR NOT FOUND in " + path + " -- refusing to guess")
            return 1

    try:
        for path, old, new in EDITS:
            write(path, saved[path].replace(old, new, 1))
        env = dict(os.environ,
                   E2E_WEB_PORT="3151", E2E_FIXTURE_PORT="4151",
                   PROBE_OUT="lanes/L-TRAIN-READONLY-VISIBLE/shots/before")
        done = subprocess.run(
            ["npx", "playwright", "test", "--config",
             "lanes/L-TRAIN-READONLY-VISIBLE/probe.config.js"],
            cwd=ROOT, env=env, capture_output=True, text=True)
        out = done.stdout + done.stderr
        for line in out.splitlines():
            if line.startswith("PROBE_JSON") or " passed" in line or " failed" in line:
                print(line)
        rc = done.returncode
    finally:
        for path in saved:
            write(path, saved[path])

    ok = all(digest(path) == before[path] for path in saved)
    print("restored byte-for-byte: " + str(ok))
    return 0 if (rc == 0 and ok) else 1


if __name__ == "__main__":
    sys.exit(main())
