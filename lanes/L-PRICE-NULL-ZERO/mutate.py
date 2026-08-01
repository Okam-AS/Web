# Mutation harness for L-PRICE-NULL-ZERO.
#
# An assertion that cannot fail proves nothing, and an absence assertion in a world that cannot
# produce the presence proves less than nothing. Each mutation below puts one half of the fix back
# the way it was (or breaks it in the opposite direction) and records which tests notice.
import subprocess, os

ROOT = "/Users/svendaneel/okam/Web-modules"
OUT = os.path.join(ROOT, "lanes/L-PRICE-NULL-ZERO/mutation-proof.txt")

PRICE = os.path.join(ROOT, "utils/price.js")
MIXIN = os.path.join(ROOT, "plugins/global-mixin.js")
CARD = os.path.join(ROOT, "components/admin/pos/CardTerminalStatus.vue")

MUTATIONS = [
    ("M1  formatChf's gate removed -> back to the shipped `Number(amountMinor) || 0`",
     PRICE,
     "  if (!isAmountStated(amountMinor)) { return UNKNOWN_AMOUNT }\n  const minor = Number(amountMinor)",
     "  const minor = Number(amountMinor) || 0"),

    ("M2  the mixin's gate removed -> both formatters see the absent value again",
     MIXIN,
     "      if (!isAmountStated(totalPrice)) { return UNKNOWN_AMOUNT }\n",
     ""),

    ("M3  CardTerminalStatus' amount prop defaults back to 0",
     CARD,
     "    amount: { type: Number, default: null },",
     "    amount: { type: Number, default: 0 },"),

    ("M4  the gate over-reaches: a genuine ZERO is called unstated too",
     PRICE,
     "  if (typeof amountMinor === 'number') { return Number.isFinite(amountMinor) }",
     "  if (typeof amountMinor === 'number') { return Number.isFinite(amountMinor) && amountMinor !== 0 }"),

    ("M5  the gate over-reaches the other way: a client-computed float is refused",
     PRICE,
     "  if (typeof amountMinor === 'number') { return Number.isFinite(amountMinor) }",
     "  if (typeof amountMinor === 'number') { return Number.isSafeInteger(amountMinor) }"),

    ("M6  the unknown mark becomes a hyphen instead of the estate's em dash",
     PRICE,
     "export const UNKNOWN_AMOUNT = '—'",
     "export const UNKNOWN_AMOUNT = '-'"),
]

lines = []


def run():
    p = subprocess.run(
        ["npx", "jest", "test/price-absence.test.js", "test/chf-format.test.js", "--coverage=false"],
        cwd=ROOT, capture_output=True, text=True)
    out = p.stdout + p.stderr
    summary = [l.strip() for l in out.splitlines() if l.strip().startswith("Tests:")]
    failed = [l.strip() for l in out.splitlines()
              if l.strip().startswith("● ") and "Console" not in l]
    return (summary[0] if summary else "NO SUMMARY"), failed


base_summary, _ = run()
lines.append("BASELINE (fix in place): " + base_summary)
lines.append("")

for name, path, old, new in MUTATIONS:
    src = open(path).read()
    if old not in src:
        lines += [name, "  !! mutation target not found - NOT APPLIED", ""]
        continue
    open(path, "w").write(src.replace(old, new, 1))
    summary, failed = run()
    open(path, "w").write(src)
    lines += [name, "  " + summary]
    lines += ["    " + f for f in failed]
    lines.append("")

restored, _ = run()
lines.append("RESTORED: " + restored)

open(OUT, "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
