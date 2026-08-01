# What the SHIPPED money formatter printed before this lane, and what it prints after.
#
# Both columns come from running the real code — the "before" column by putting the two gates back
# exactly as they were and asking the same formatter the same questions again. Nothing here is a
# stand-in or a reimplementation.
import subprocess, os, json

ROOT = "/Users/svendaneel/okam/Web-modules"
LANE = os.path.join(ROOT, "lanes/L-PRICE-NULL-ZERO")
OUT = os.path.join(LANE, "before-after.txt")
PROBE = os.path.join(ROOT, "test", "zz-capture.test.js")

PRICE = os.path.join(ROOT, "utils/price.js")
MIXIN = os.path.join(ROOT, "plugins/global-mixin.js")

REVERT = [
    (PRICE,
     "  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }\n  const minor = Number(amountMinor)",
     "  const minor = Number(amountMinor) || 0"),
    (MIXIN,
     "      if (!isAmountStated(totalPrice)) { return UNKNOWN_AMOUNT }\n",
     ""),
]

PROBE_SRC = """
import { globalMixin } from '~/plugins/global-mixin'
const money = globalMixin.methods.priceLabel
const cases = [
  ['null', null], ['undefined', undefined], ["''", ''], ['NaN', NaN],
  ['0 (a real zero)', 0], ['20680 (kr 206,80)', 20680]
]
test('capture', () => {
  const rows = cases.map(([name, value]) => ({
    value: name,
    no: money.call({ isCh: false }, value, false),
    ch: money.call({ isCh: true }, value)
  }))
  // eslint-disable-next-line no-console
  console.log('CAPTURE' + JSON.stringify(rows))
  expect(true).toBe(true)
})
"""


def capture():
    open(PROBE, "w").write(PROBE_SRC)
    p = subprocess.run(["npx", "jest", "test/zz-capture.test.js", "--coverage=false"],
                       cwd=ROOT, capture_output=True, text=True)
    os.remove(PROBE)
    out = p.stdout + p.stderr
    marker = out.index("CAPTURE")
    end = out.index("\n", marker)
    return json.loads(out[marker + len("CAPTURE"):end].strip())


after = capture()

originals = {}
for path, old, new in REVERT:
    src = open(path).read()
    originals[path] = src
    assert old in src, path
    open(path, "w").write(src.replace(old, new, 1))
before = capture()
for path, src in originals.items():
    open(path, "w").write(src)

check = capture()
assert check == after, "the revert was not undone cleanly"

W = 20
lines = [
    "The admin's own money formatter (plugins/global-mixin.js priceLabel), asked the same six",
    "questions before and after this lane. Both columns are the shipped code, not a stand-in:",
    "the BEFORE column was produced by putting the two gates back and re-running.",
    "",
    "  " + "value".ljust(W) + "BEFORE no".ljust(14) + "AFTER no".ljust(14)
    + "BEFORE ch".ljust(14) + "AFTER ch",
    "  " + "-" * (W + 14 * 3 + 12),
]
for b, a in zip(before, after):
    lines.append("  " + b["value"].ljust(W) + b["no"].ljust(14) + a["no"].ljust(14)
                 + b["ch"].ljust(14) + a["ch"])
lines += [
    "",
    "Before, the first four rows were indistinguishable from the fifth: an amount nobody stated",
    "and an amount somebody computed as zero printed the same characters. After, only the amount",
    "somebody stated is a price.",
]
open(OUT, "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
