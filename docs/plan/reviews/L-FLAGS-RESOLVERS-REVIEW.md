# Fable review — L-FLAGS-EFFECTIVE-RESOLVERS (2026-08-02)

Read-only review of `lane/flags-effective-resolvers` @ `e45ec4c1`. Nothing edited, nothing run.

## 1. Verdict — sound, with three small named conditions

**The three resolvers quote the exact gate object the routes enforce with** — same registration, verified
consumer by consumer. **Every resolver-evidence test seeds the row and the deployment switch to opposite
values**, which was the trap. The reach-pin subtraction is **guarded against becoming a hole**. The receipt
exists at the commit and **matches its description exactly.** And the frontend needs no change for the
warning to fire.

Conditions: one excuse string contains a **factual error**, the excuse list is **module-granular rather
than flag-granular** so *excused by name* overstates what the code enforces, and a frontend comment now
asserts an impossibility this lane made routine. **None of these makes the reported value wrong.**

## 2. Is the sentence true now — in both directions?

**Yes, for all three built resolvers**, each verified against the same instance the enforcing routes hold:
Meals reports the row falling back to configuration, so the case that read off while the gate answered on
is closed; **Events reports off for a row flipped on under a deployment switch verified absent from the
shipped settings**; and Growth the same against a switch that ships false.

Margin holds from the prior lane. The Workforce module flag holds and **is pinned over HTTP**. Its six
stage flags need no resolver — **the excuse verified true**, since the gate reads the stage flag alone and
defaults project from the same declared list.

**Training — the claim most likely to be wrong by one case, and it is right at the level the seam
operates.** The flag's effective value never diverges. But the module gate keeps a store with existing
data **read-visible with the flag off**, by a deliberate disabled-after-data regime. *Effective off*
reliably means **writes are refused** — which is what the note promises — **it does not mean the module is
dark for reads**, and nothing on the screen says so. A route-composition fact, not a reporting lie.
**Excuse upheld, risk noted.**

## 3. Defects, most severe first

1. **The excuse list is a module-keyed denylist, and one reason is factually wrong.** It excuses *any*
   unclaimed flag of an excused module. Three consequences: the Training entry opens **"all seven advertised
   flags"** when Training advertises **two** — a wrong first sentence **inside the mechanism whose whole
   justification is named reasons**. Deleting the Workforce resolver registration **would not red this
   guard**, because the module entry absorbs it — compensated only by a separate HTTP pin. And a future
   diverging flag *inside* an excused module passes unexamined; **only a new module reds.** So *every
   catalog flag must be claimed or excused by name* is **true in prose, not in code.**
2. **A frontend comment now asserts a falsehood** — that the state *stored off, effective on* cannot happen
   through this API. **The Meals resolver makes exactly that state routine**, and it already occurred for
   grandfathered stores. The behaviour is right; **the impossibility claim should go before someone
   codifies it.**
3. **Account inaccuracy, in the safe direction:** a row-ignoring resolver reds **four** cases, not the three
   claimed — **more row-sensitivity than stated, not less.**
4. Minor: a comment says the reporter is never reached by a controller, but the scan covers only one
   namespace. The structural guarantee that matters still holds.

## 4. Assertions that could pass against broken code

The three **labelled** regression guards pass with no resolver registered — **and each says so in its own
comment.** Honest labelling, not vacuity.

Two per-module tests pass against a resolver that ignores the row and quotes only the outer switch — **but
each file's deployed-true guard reds that mutation**, so no single broken shape survives the file.

The catalog guard passes with the Workforce registration deleted (defect 1), covered only by the separate
HTTP pin.

The wire guard passes against resolvers reporting **wrong values** — **explicitly documented**, and
genuinely covered at the service tier where the switch is a variable. **Not a third unable-to-fail
instance: the trap was avoided, and every case presented as resolver evidence seeds row and switch to
opposite values.**

## 5. The receipt, and what could not be determined

**Receipt verified in detail.** It exists at the commit, its counters are **character-for-character the
commit's claim**, it contains all twenty-three new and modified tests, **zero SQL-Server-traited results** —
and the seven apparent grep hits were container-free siblings sharing files with traited classes — and the
skips are the pre-existing documented gaps. **The tier guard ran inside the same file.** Consistent with
the trait filter, not the name filter.

Could not determine: nothing was run, so all mutation claims are by reading. **A test file records no
commit**, so *produced from exactly this tree* rests on timestamps plus the presence of every new test —
**strong, not absolute.** Not every route was re-traced to its gate. And the sibling frontend pins were
verified to exist in all three locales, **not that the pin tests themselves are sound.**

**No false claim in the brief.** The lane's account is accurate except the two overstatements named.
