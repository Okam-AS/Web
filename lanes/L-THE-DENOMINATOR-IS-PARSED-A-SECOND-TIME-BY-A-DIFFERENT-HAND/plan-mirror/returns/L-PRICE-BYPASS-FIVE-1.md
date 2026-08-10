```
RETURN: L-PRICE-BYPASS-FIVE
brief: 3930377f
verdict: built
evidence: refs/lanes/L-PRICE-BYPASS-FIVE (parent e34977ac); 40/40 pins; lanes/L-PRICE-BYPASS-FIVE/remaining-sites.md
log:
Baseline e34977ac. Six sites fixed, each pinned over null, zero and a stated amount.
kravia-invoice declared its own `priceLabel`; a component method shadows the mixin's, so
the absence gate never ran on any invoice figure, incl. the pre-issue confirm dialog. Now
gated AND renamed to invoiceAmountLabel so the name no longer collides. Deletion was not
available: the mixin renders core's `kr `-prefix, an invoice prints nb-NO suffix style.
settlements formatAmount rendered absence and a genuine zero as the same string. Also
fixed: wolt-menu formatPrice, reward-members formatBalance, products + Onboarding raw /100.
Rule now lives once in utils/price.js; each page keeps its own format byte-identical.
X report differs: gate was right, the + ran first. statedSum withholds any unstated addend.
Domains checked per site: all hold wire values. NOT applied to kravia-invoice FORM
arithmetic, which getValidationError already refuses at <= 0 before the dialog opens.
Wolt's price INPUT seeds '' not a dash; its blur no longer writes a zero.
Red-proof: reverting the 5 pages turns 9 tests red; XReportView alone 3.
Dead calculateTotalRewards deleted. Inventory incl. the `−—` rows in the lane dir.
3 pages cannot mount (?. in template) so are source-pinned. C5: no human acceptance yet.
END RETURN
```
