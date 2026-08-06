#!/usr/bin/env python3
"""Mutation proof for L-TRAIN-READONLY-VISIBLE.

Each mutation breaks one obligation the new tests claim to hold. A mutation that leaves the suite
green is a test that cannot fail, which is the defect this program keeps finding. Every file is
restored and checksum-verified before the next mutation runs.
"""
import hashlib
import subprocess
import sys

ROOT = "/Users/svendaneel/okam/Web-modules/"
PAGE = ROOT + "pages/admin/feature-flags.vue"
NO = ROOT + "translations/no.ts"
SUITE = ["npx", "jest", "test/feature-flags-page.test.js", "--coverage=false"]

MUTATIONS = [
    ("M1 the assignments row loses its sentence",
     PAGE,
     "  'training.assignments': 'ff_off_training_assignments'\n",
     ""),
    ("M2 both rows share the setup sentence",
     PAGE,
     "'training.assignments': 'ff_off_training_assignments'",
     "'training.assignments': 'ff_off_training_setup'"),
    ("M3 the sentence is hidden unless the row is already off",
     PAGE,
     "      return (row && Object.prototype.hasOwnProperty.call(FLAG_OFF_BEHAVIOUR, row.flagKey))",
     "      return (row && row.state === false && Object.prototype.hasOwnProperty.call(FLAG_OFF_BEHAVIOUR, row.flagKey))"),
    ("M4 the sentence is printed below the switch instead of above it",
     PAGE,
     """            <!-- What OFF does to this module, for the flags where "off" does not mean "gone". Above
                 the control for the same reason the precondition is: it is read at the moment of the
                 click, by someone who may be mid-incident and expecting the module to disappear. -->
            <p
              v-if="offBehaviourKey(row)"
              class="ff-row__offmeaning"
              :data-off-meaning="row.flagKey"
            >
              {{ $i(offBehaviourKey(row)) }}
            </p>

""",
     ""),
    ("M5 the sentence is put on every row instead of the two whose gate was read",
     PAGE,
     "      return (row && Object.prototype.hasOwnProperty.call(FLAG_OFF_BEHAVIOUR, row.flagKey))\n        ? FLAG_OFF_BEHAVIOUR[row.flagKey]\n        : null;",
     "      return row ? (FLAG_OFF_BEHAVIOUR[row.flagKey] || 'ff_off_training_setup') : null;"),
    ("M6 the setup copy drops the store that does go dark",
     NO,
     " Det ene unntaket er en butikk som aldri har registrert noe treningsdata — den blir usynlig når denne står av, og sidene svarer «finnes ikke» i stedet.",
     ""),
    ("M7 the setup copy stops saying the submit stays live",
     NO,
     ", men listene lastes som før, skjemaet tegnes og lagreknappen er aktiv: avvisningen kommer først når du trykker. Modulen blir altså ikke borte.",
     "."),
    ("M8 the assignments copy claims it decides visibility after all",
     NO,
     "og den avgjør ikke om modulen er synlig — det gjør training.setup og dataene butikken allerede har.",
     "og den avgjør om modulen er synlig."),
    ("M9 the old fleet-wide reads-keep-working promise is put back in the intro",
     NO,
     "Alt er avslått som utgangspunkt. Hva «av» gjør med lesingen, er ikke likt fra modul til modul — noen fortsetter å vise det som allerede er registrert, andre blir helt borte — så les raden før du slår av.",
     "Alt er avslått som utgangspunkt: en bryter som ikke står på, avviser skrivinger — lesing og eksport av det som allerede er registrert, fortsetter."),
]


def digest(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def read(path):
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def run():
    done = subprocess.run(SUITE, cwd=ROOT, capture_output=True, text=True)
    tail = done.stderr + done.stdout
    line = [l for l in tail.splitlines() if l.startswith("Tests:")]
    return done.returncode, (line[0].strip() if line else "NO SUMMARY")


def main():
    baseline = {PAGE: digest(PAGE), NO: digest(NO)}
    code, summary = run()
    print("BASE            : rc=%d %s" % (code, summary))
    if code != 0:
        print("base is not green; aborting")
        return 1

    ok = True
    for name, path, old, new in MUTATIONS:
        original = read(path)
        if old not in original:
            print("%-16s: ANCHOR NOT FOUND -- mutation could not be applied" % name[:16])
            ok = False
            continue
        write(path, original.replace(old, new, 1))
        code, summary = run()
        write(path, original)
        assert digest(path) == baseline[path], "restore failed for " + path
        verdict = "RED (good)" if code != 0 else "GREEN -- TEST CANNOT FAIL"
        if code == 0:
            ok = False
        print("%s\n    %s  %s" % (name, verdict, summary))

    for path, want in baseline.items():
        assert digest(path) == want, "tree not restored: " + path
    print("\nall files restored byte-for-byte")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
