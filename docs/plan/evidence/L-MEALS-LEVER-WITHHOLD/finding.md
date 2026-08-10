# L-MEALS-LEVER-WITHHOLD — the exit asks for the opposite of a ruled decision

**Exit as it stands:** *the Meals catalog entry is **withheld** with a written reason in the shape Training
and Workforce already use, pinned by a test that reds if it is re-advertised.*

**Reason shape hit: (4) the evidence proves the OPPOSITE, and the brief's instruction for that shape is
explicit — do not build toward the exit.** Nothing was built, nothing was mutated, no flag file was
touched, and the exit was **not** rewritten. This is the record for an owner ruling.

**The `evidence:` line, preserved:** `lanes/L-MEALS-LEVER-WITHHOLD/retitle-and-pin.md` — relative to the
**backend** repo, where it is tracked on the trunk (`a7365826b`, *"Recover L-MEALS-LEVER-WITHHOLD evidence
onto the trunk"*). It does not exist at that path in the plan repo, which is worth knowing before anyone
concludes it is missing.

## Why no amount of work in this lane can close this exit

1. **The plan itself already says not to.** The lane body in `plan.md` reads: *"**Ruled `retitle-and-pin`
   on 2026-08-05.** **The exit below asks for the opposite of what was ruled. Do not satisfy it.**"*
2. **The decision is ruled, by the owner, with the alternative rejected on measurement.**
   `D-SPEC-L-MEALS-LEVER-WITHHOLD` is `state: ruled` — *`ruled: retitle-and-pin 2026-08-05 by @sven`*. Its
   `withhold-anyway` option is recorded with the con that decided it: *"measured, it reds 8 of 28, and the
   blocker is a guard that has already ruled this question — a per-store-seam gate has no withholding
   escape hatch."*
3. **The artifact says so in its first paragraph**, and is a record of the opposite action:
   *"The withholding is NOT applied: it reds 8 of 28 arms, including the landed guard whose own failure
   text — 'the row this gate reads can never be written' — is the design ruling."*
4. **The pin that exists holds a different sentence.** `WebApi.Tests/Meals/MealsOperatorLeverReachTests.cs`
   pins the descriptor **title against its route-gate reach** — derived from the last segment of every
   route whose gate resolves `meals.module`, refusing both degenerate reaches (none, and all). Red in both
   directions, one tree, `--no-build` never used: **29 passed after the pin, 28 arms before it**; a wider
   filter over six suites returns **231 passed / 0 failed**. That is a good pin. It is not a pin that
   *"reds if the entry is re-advertised"*, because the entry was never withdrawn.

Verifying this lane against `retitle-and-pin.md` would attach `verified` to an exit whose sentence the
artifact denies. Batch 6 refused it for the same reason; this pass confirms the refusal rather than
re-deriving it.

## What an owner has to rule

The lane is **done** on the ruling that governs it and **unclosable** on the exit that was written before
that ruling. Only an owner can resolve the mismatch, and there are exactly two honest ways:

- **amend the exit to the ruled shape** — the Meals catalog entry's title names what the flag actually
  reaches, pinned by a test that reds if the title and the route-gate reach move apart, recorded in
  `lanes/L-MEALS-LEVER-WITHHOLD/retitle-and-pin.md` (backend repo); or
- **retract the lane** and let `L-WF-LEVER-TITLE-NAMES-ITS-REACH` carry the retitle family.

**An agent must not make that edit.** This program's standing lesson is that an exit rewritten to fit its
evidence proves nothing, and the difference between that failure and the legitimate amendment above is
precisely that the owner ruled the substance first.

## Two things left open by the ruling, carried so they are not lost

- `WorkforceFeatureFlags` carries the **identical** `"Module (store surfaces)"` title. Its reach was not
  measured by that lane and it was left untouched rather than retitled on a guess.
- Flipping `meals.module` on still delivers *"a company directory you cannot create a company in"*. The ON
  direction is a different lane and is not claimed by anything here.
