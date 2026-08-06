#!/bin/bash
# Each mutation is a change a reasonable author could actually make. For each, the test file must go
# RED, and the named test must be among the failures. A pin that survives its own defect is not a pin.
cd /Users/svendaneel/okam/Web-modules
V=components/admin/pos/XReportView.vue
P=utils/price.js
B=lanes/L-XZ-NEGATED-ABSENCE/.backup
mkdir -p "$B"; cp "$V" "$B/XReportView.vue"; cp "$P" "$B/price.js"
restore () { cp "$B/XReportView.vue" "$V"; cp "$B/price.js" "$P"; }
trap restore EXIT

run () { npx jest test/xz-negated-absence.test.js --coverage=false 2>&1 | grep -E "^Tests:" ; }

echo "=== M0  the fix as written (control) — expect ALL PASS"
run

echo
echo "=== M1  the original defect: the sign as a template literal, restored verbatim"
git show c4a4fa44:$V > "$V"
run

echo
echo "=== M2  the tempting wrong fix: delete the minus literal, keep priceLabel"
git show c4a4fa44:$V | perl -CSD -pe 's/\x{2212}\{\{ priceLabel/\{\{ priceLabel/g' > "$V"
run
restore

echo
echo "=== M3  sign owned by the label, but absence not gated (returns the sign anyway)"
perl -0777 -CSD -i -pe 's/if \(!isAmountStated\(amountMinor\)\) \{ return UNKNOWN_AMOUNT \}\n  const negated/const negated/' "$P"
run
restore

echo
echo "=== M4  a truthiness guard instead of isAmountStated (destroys the genuine zero)"
perl -0777 -CSD -i -pe 's/if \(!isAmountStated\(amountMinor\)\) \{ return UNKNOWN_AMOUNT \}\n  const negated = -Number\(amountMinor\)/if (!amountMinor) { return UNKNOWN_AMOUNT }\n  const negated = -Number(amountMinor)/' "$P"
run
restore

echo
echo "=== M5  negate the VALUE and let the formatter print the sign (the design rejected)"
perl -0777 -CSD -i -pe 's/  return \(negated < 0 \? MINUS_SIGN : .{2}\) \+ formatAmount\(Math\.abs\(negated\)\)/  return formatAmount(negated)/' "$P"
run
restore

echo "=== M6  the sign printed unconditionally, so a zero and a negation both wear it"
perl -0777 -CSD -i -pe 's/  return \(negated < 0 \? MINUS_SIGN : .{2}\) \+ formatAmount\(Math\.abs\(negated\)\)/  return MINUS_SIGN + formatAmount(Math.abs(negated))/' "$P"
run
restore

echo
echo "=== M7  the sign dropped unconditionally (deduction rows all read as positives)"
perl -0777 -CSD -i -pe 's/  return \(negated < 0 \? MINUS_SIGN : .{2}\) \+ formatAmount\(Math\.abs\(negated\)\)/  return formatAmount(Math.abs(negated))/' "$P"
run
restore

echo "=== restored; confirming control is green again"
run
