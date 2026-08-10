#!/usr/bin/env python3
"""Mutation harness for the six rescued POS money-path suites.

For each mutation: apply an exact string replacement to the SHIPPED source, run only the
suite that claims to protect it, record whether it went red, then restore the file byte-for-byte.
A mutation that leaves the suite green is a hole in the suite, not a hole in the product.
"""
import json
import os
import re
import subprocess
import sys

ROOT = "/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/till/Web-modules"
POS = "components/admin/pos"

# (id, suite, source file, old substring, new substring, what the mutation means)
MUTATIONS = [
    # ---- 1. CashPad — cash tender and change -----------------------------------------------
    ("M1.1", "pos-cash-tender-and-change", f"{POS}/CashPad.vue",
     "due () { return Math.round(this.amount / 100) * 100; }",
     "due () { return Math.floor(this.amount / 100) * 100; }",
     "ore rounding goes DOWN: a 62,50 part is asked for as 62,00 and the server refuses the tender"),
    ("M1.2", "pos-cash-tender-and-change", f"{POS}/CashPad.vue",
     "change () { return Math.max(0, this.tendered - this.due); }",
     "change () { return this.tendered - this.due; }",
     "the floor at zero is removed: an under-tender renders as negative change"),
    ("M1.3", "pos-cash-tender-and-change", f"{POS}/CashPad.vue",
     "canConfirm () { return this.tendered >= this.due; }",
     "canConfirm () { return this.tendered > this.due; }",
     "an exact tender is refused and a zero due dead-ends the sale"),
    ("M1.4", "pos-cash-tender-and-change", f"{POS}/CashPad.vue",
     "return unique.slice(0, 4);",
     "return unique.slice(0, 5);",
     "a fifth preset button appears on the pad"),
    ("M1.5", "pos-cash-tender-and-change", f"{POS}/CashPad.vue",
     "amount () { this.tendered = this.due; }",
     "amount () { /* mutated: no re-seed */ }",
     "the reused pad keeps the previous portion's tender across a split"),

    # ---- 2. EodWizard — day-close cash difference -------------------------------------------
    ("M2.1", "pos-day-close-cash-difference", f"{POS}/EodWizard.vue",
     "diff () { return this.counted - this.expectedCash; }",
     "diff () { return this.expectedCash - this.counted; }",
     "the difference is reversed: every shortfall reads as an overage on the signed Z"),
    ("M2.2", "pos-day-close-cash-difference", f"{POS}/EodWizard.vue",
     "explanationRequired () { return this.diff !== 0; }",
     "explanationRequired () { return Math.abs(this.diff) > this.maxDifference; }",
     "the tolerance limit gates the explanation, so a small difference closes the day unexplained (S 5-3-14)"),
    ("M2.3", "pos-day-close-cash-difference", f"{POS}/EodWizard.vue",
     "outOfTolerance () { return Math.abs(this.diff) > this.maxDifference; }",
     "outOfTolerance () { return Math.abs(this.diff) >= this.maxDifference; }",
     "exactly at the cash point limit is flagged as past it"),
    ("M2.4", "pos-day-close-cash-difference", f"{POS}/EodWizard.vue",
     "differenceReasonType: explain ? this.reasonSel.reasonType : 'None',",
     "differenceReasonType: this.reasonSel.reasonType,",
     "a stale reason rides along on a zero-difference Z -- the one the source guards deliberately"),
    ("M2.5", "pos-day-close-cash-difference", f"{POS}/EodWizard.vue",
     "canProceedCount () { return !this.explanationRequired || this.reasonChosen; }",
     "canProceedCount () { return true; }",
     "the day closes with an unexplained difference"),

    # ---- 3. PosReceiptView — payer line and signature ---------------------------------------
    ("M3.1", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "if (type === 'Giftcard') { return this.$i('pos_pay_giftcard'); }",
     "",
     "the gift-card arm of the payer ladder is dropped"),
    ("M3.2", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "return s.length > 24 ? s.slice(0, 24) + '…' : s;",
     "return s.length > 23 ? s.slice(0, 24) + '…' : s;",
     "off-by-one: a whole 24-character signature is marked as truncated"),
    ("M3.3", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "return s.length > 24 ? s.slice(0, 24) + '…' : s;",
     "return s.length > 24 ? s.slice(-24) + '…' : s;",
     "the signature is truncated from the BACK, so a reader cannot match it against the journal"),
    ("M3.4", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "taxLines () { return this.receipt.taxLines || []; }",
     "taxLines () { return this.receipt.taxLines; }",
     "an absent VAT specification breaks the receipt instead of printing no block"),
    ("M3.5", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "if (type === 'SurfboardTerminal' || type === 'DinteroTerminal') { return this.$i('pos_pay_card'); }",
     "if (type === 'SurfboardTerminal') { return this.$i('pos_pay_card'); }",
     "one terminal make loses its label while the other keeps it"),
    ("M3.6", "pos-receipt-payer-line-and-signature", f"{POS}/PosReceiptView.vue",
     "      return type;\n",
     "      return '';\n",
     "THE BLANK PAYER LINE: an unmapped medium renders an empty payer row"),

    # ---- 4a. RefundModal — the refund cap ----------------------------------------------------
    ("M4.1", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "return Math.min(tenderAmount, this.receipt.grossAmount);",
     "return this.receipt.grossAmount;",
     "a split sale refunds the whole gross to a tender that only carried part of it"),
    ("M4.2", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "return Math.min(tenderAmount, this.receipt.grossAmount);",
     "return tenderAmount;",
     "a tender carrying gross + tip refunds the tip as well"),
    ("M4.3", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "cardLine () { return (this.receipt.payments || []).find(p => p.paymentTransactionId); }",
     "cardLine () { return (this.receipt.payments || []).find(p => p.paymentType !== 'Cash'); }",
     "a card line whose transaction never came back is treated as refundable to the card"),
    ("M4.4", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "if (this.amountMode === 'partial' && (this.partialAmount <= 0 || this.partialAmount > this.maxAmount)) { return false; }",
     "if (this.amountMode === 'partial' && this.partialAmount <= 0) { return false; }",
     "the cap is dropped from the button, so a refund above what was taken can be pressed"),
    ("M4.5", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "      if (this.busy) { return false; }\n      if (!this.reasonChosen || !this.customerPhone.trim()) { return false; }",
     "      if (!this.reasonChosen || !this.customerPhone.trim()) { return false; }",
     "a second tap fires while the first refund request is still in flight"),
    ("M4.6", "pos-refund-cap-and-guest-split", f"{POS}/RefundModal.vue",
     "      returnId: newGuid(),",
     "      returnId: 'fixed-return-id',",
     "every refund modal shares one idempotency key"),
    # ---- 4b. SplitBillModal — what each guest owes -------------------------------------------
    ("M4.7", "pos-refund-cap-and-guest-split", f"{POS}/SplitBillModal.vue",
     "        map[s].subtotal += l.netLineAmount;",
     "        map[s].subtotal = l.netLineAmount;",
     "a guest's bucket shows only the last line, not the sum of that guest's lines"),
    ("M4.8", "pos-refund-cap-and-guest-split", f"{POS}/SplitBillModal.vue",
     "        if (s == null) { return; }",
     "        if (s == null) { map[1] = map[1] || { seat: 1, lines: [], subtotal: 0 }; map[1].lines.push(l); map[1].subtotal += l.netLineAmount; return; }",
     "an unplaced line is silently charged to guest one"),
    ("M4.9", "pos-refund-cap-and-guest-split", f"{POS}/SplitBillModal.vue",
     "      return Object.keys(map).map(k => map[k]).sort((a, b) => a.seat - b.seat);",
     "      return Object.keys(map).map(k => map[k]);",
     "the buckets come out in line-arrival order rather than by guest number"),
    ("M4.10", "pos-refund-cap-and-guest-split", f"{POS}/SplitBillModal.vue",
     "      return this.allPlaced && this.seatBuckets.length >= 2;",
     "      return this.allPlaced && this.seatBuckets.length >= 1;",
     "one guest holding every line counts as a valid split"),
    ("M4.11", "pos-refund-cap-and-guest-split", f"{POS}/SplitBillModal.vue",
     "      return Math.min(Math.max(m, 2), 20);",
     "      return Math.min(Math.max(m, 2), 8);",
     "the guest chip row is capped at eight instead of twenty"),

    # ---- 5. ReturnBuilder — return document amount and VAT ------------------------------------
    ("M5.1", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "total () { return this.lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0); }",
     "total () { return this.lines.reduce((sum, l) => sum + l.unitAmount, 0); }",
     "quantity is ignored: three burgers are paid out as one"),
    ("M5.2", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "      if (g && g.takeAwayVatPercent != null && g.eatInVatPercent != null && g.deliveryVatPercent != null) {",
     "      if (g && g.takeAwayVatPercent != null) {",
     "a partially-filled goods-group profile is read as authoritative"),
    ("M5.3", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "      const vatPercent = derived != null ? derived : (this.vatRates.includes(p.tax) ? p.tax : 25);",
     "      const vatPercent = derived != null ? derived : 25;",
     "A RETURN COMPUTED FROM A LISTED PRICE: a legal 12% product rate is rewritten to 25%"),
    ("M5.4", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "        return this.vatContext === 'TableDelivery' ? g.eatInVatPercent : g.takeAwayVatPercent;",
     "        return g.takeAwayVatPercent;",
     "the eat-in context never reaches the rate: a table return is journalled at the take-away rate"),
    ("M5.5", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "        const v = this.effectiveVat(l.goodsGroupId);\n        if (v != null) { l.vatPercent = v; }",
     "        const v = this.effectiveVat(l.goodsGroupId);\n        l.vatPercent = v;",
     "switching context wipes an unprofiled line's operator-chosen rate to null"),
    ("M5.6", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "        if (!this.lines.length || this.lines.some(l => l.goodsGroupId == null)) { return false; }",
     "        if (!this.lines.length) { return false; }",
     "an unclassified line no longer blocks the payout"),
    ("M5.7", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "        if (this.method === 'cash' && !this.signature) { return false; }",
     "        if (false && this.method === 'cash' && !this.signature) { return false; }",
     "cash leaves the drawer with no customer signature"),
    ("M5.8", "pos-return-document-amount-and-vat", f"{POS}/ReturnBuilder.vue",
     "          .filter(i => !i.isHeading && i.product && !i.product.hide)",
     "          .filter(i => i.product)",
     "headings and hidden products are offered as returnable menu items"),

    # ---- 6. PaymentScreen — split payment shares ---------------------------------------------
    ("M6.1", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      return Math.min(this.splitOutstanding, Math.ceil(this.splitOutstanding / this.splitPersonsLeft / 100) * 100);",
     "      return Math.ceil(this.splitOutstanding / this.splitPersonsLeft / 100) * 100;",
     "the round-up is uncapped: a 0,99 remainder split two ways asks each payer for more than the bill"),
    ("M6.2", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      return Math.min(this.splitOutstanding, Math.ceil(this.splitOutstanding / this.splitPersonsLeft / 100) * 100);",
     "      return Math.min(this.splitOutstanding, Math.floor(this.splitOutstanding / this.splitPersonsLeft / 100) * 100);",
     "shares round DOWN, so the settlement closes short by the drift"),
    ("M6.3", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      if (this.splitPersonsLeft === 1) { return this.splitOutstanding; }",
     "      if (this.splitPersonsLeft === 1) { return Math.round(this.splitOutstanding / 100) * 100; }",
     "THE LAST PAYER's ore are rounded away, so the settlement closes short or over"),
    ("M6.4", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "splitPersonsLeft () { return Math.max(1, this.splitPersons - this.splitParts.length); }",
     "splitPersonsLeft () { return this.splitPersons - this.splitParts.length; }",
     "a payer who leaves without paying divides the remainder by zero or a negative"),
    ("M6.5", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "splitCashDue () { return Math.round(this.splitOutstanding / 100) * 100; }",
     "splitCashDue () { return Math.ceil(this.splitOutstanding / 100) * 100; }",
     "the cash remainder rounds up rather than to nearest, diverging from the server"),
    ("M6.6", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      return !!this.pos.cashPoint.surfboardTerminalId && this.pos.cashPoint.partialPaymentsEnabled === true;",
     "      return !!this.pos.cashPoint.surfboardTerminalId && !!this.pos.cashPoint.partialPaymentsEnabled;",
     "the tri-state rollout flag reads as enabled when merely truthy"),
    ("M6.7", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "splitChargeValid () { return this.splitChargeAmount > 0 && this.splitChargeAmount <= this.splitOutstanding; }",
     "splitChargeValid () { return this.splitChargeAmount > 0; }",
     "a custom portion above the outstanding can be charged"),
    ("M6.8", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      return this.splitPortion > 0 && this.splitPortion % 100 === 0 && this.splitPortion < this.splitOutstanding;",
     "      return this.splitPortion > 0 && this.splitPortion < this.splitOutstanding;",
     "a cash-first portion carrying ore is accepted, though cash does not come in ore"),
    ("M6.9", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      return [...new Set(shares)];",
     "      return shares;",
     "the quick-amount row repeats identical shares"),
    # The claim recorded in the suite: the splitPersonsLeft===1 early return is REDUNDANT.
    # Deleting it must leave the suite GREEN. This is an EQUIVALENT mutant, asserted as such.
    ("M6.E", "pos-split-payment-shares", f"{POS}/PaymentScreen.vue",
     "      if (this.splitPersonsLeft === 1) { return this.splitOutstanding; }\n",
     "",
     "EQUIVALENT BY CLAIM: deleting the redundant last-payer early return must change no answer"),
]

EXPECT_GREEN = {"M6.E"}


def run(suite):
    p = subprocess.run(
        ["node", "node_modules/.bin/jest", "--ci", "--coverage=false", f"test/{suite}.test.js"],
        cwd=ROOT, capture_output=True, text=True,
    )
    tail = p.stderr + p.stdout
    m = re.search(r"Tests:\s+(?:(\d+) failed, )?.*?(\d+) total", tail)
    failed = int(m.group(1)) if (m and m.group(1)) else 0
    total = int(m.group(2)) if m else -1
    names = re.findall(r"●\s+(?!Console)([^\n]+?)\n", tail)
    return p.returncode, failed, total, [n.strip() for n in names if "›" in n or True][:6]


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    results = []
    for mid, suite, rel, old, new, meaning in MUTATIONS:
        if only and not mid.startswith(only):
            continue
        path = os.path.join(ROOT, rel)
        with open(path, "r", encoding="utf-8") as f:
            original = f.read()
        n = original.count(old)
        if n != 1:
            results.append(dict(id=mid, suite=suite, file=rel, meaning=meaning,
                                status="ANCHOR-NOT-UNIQUE", occurrences=n))
            print(f"{mid:6} ANCHOR x{n}  {rel}")
            continue
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(original.replace(old, new, 1))
            rc, failed, total, names = run(suite)
        finally:
            with open(path, "w", encoding="utf-8") as f:
                f.write(original)
        want_green = mid in EXPECT_GREEN
        killed = rc != 0
        ok = (not killed) if want_green else killed
        status = ("EQUIVALENT-CONFIRMED" if (want_green and not killed)
                  else "EQUIVALENT-REFUTED" if want_green
                  else "KILLED" if killed else "SURVIVED")
        results.append(dict(id=mid, suite=suite, file=rel, meaning=meaning, status=status,
                            failed=failed, total=total, first_failures=names[:4], ok=ok))
        print(f"{mid:6} {status:20} {failed:>3}/{total:<3} {meaning[:70]}")
    with open("/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/mutation-results.json", "w") as f:
        json.dump(results, f, indent=2)
    bad = [r for r in results if not r.get("ok")]
    print(f"\n{len(results)} mutations, {len(bad)} not as expected")
    for r in bad:
        print(f"  {r['id']}: {r['status']} — {r['meaning']}")


if __name__ == "__main__":
    main()
