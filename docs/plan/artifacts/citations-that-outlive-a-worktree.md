# Citations that outlive a worktree

**This lane edited nothing** — not an exit, not an evidence line, not a file. It produces the pairing:
for each rescued file, the lane citing it, its durable path, what would have to change to cite it, and who
holds that authority. Trunk `6d5328004`, unmoved.

## The routing, and it is the same for all 21

| question | answer |
|---|---|
| does the `exit:` name **this** artifact? | **21 of 21** — by filename, at a location that dies with the worktree |
| does the lane **body** designate it? | **0 of 21** — every body is silent |
| would the `evidence:` line alone suffice? | **no** — `plan verify` checks the **exit**, not the evidence line |

**So all 21 reach the same place, and it is a fourth answer rather than one of the three:**

Citing the durable copy requires the **exit** to change, because that is what the tool reads. But the exit
may only be amended where the lane body designated the artifact **before the work began**, and no body here
does. **The exit cannot be amended and the evidence line cannot be rewritten, so no existing authority can
cite these files.** They are durable, paired and unreachable by the rules as they stand.

That is a deadlock to rule on, not a defect to fix, and it is the output of this lane.

## Who holds what

| change | who holds it | may they act today |
|---|---|---|
| amend an `exit:` to name a path | the exits lane (`L-EVERY-EXIT-NAMES-THE-FILE-ITS-OWN-LANE-DESIGNATED`) | **no** — its own rule forbids it where the body is silent, which is all 21 |
| rewrite an `evidence:` line | nobody — they are RETURN records, and a sibling ruled that rewriting one to suit a parser is editing the record to fit the instrument | **no** |
| relax the body-designation rule, or let an exit cite a rescue | the owner | **not asked yet** |
| copy a file to a durable path | this lane's predecessor | already exercised — the 21 copies exist |

## The 27, ruled separately

They do not belong with the 21 and must not be swept up with them. They cite a **branch and a SHA**, not a
file, so the question is whether that citation is durable. Measured rather than assumed:

- of 40 SHAs cited by these lines, **35 resolve** in the backend repo and **5 do not**

- of 20 lane branches sampled, **12 are reachable from a remote ref** and 8 exist only locally

**So the answer is a qualified no.** A SHA is immutable and survives `git worktree prune`, which is the
hazard this family was raised for — against *that* they need nothing. But 5 already fail to resolve, and a
citation whose branch is unpushed dies with the machine, not with the worktree. **They are durable against
tidying and not against a fresh clone**, and that distinction is the whole of the ruling.

## Provenance, using the only method available

For each rescued file, whether any commit in the backend repo holds a blob with **identical contents**:

| | count |
|---|---:|
| exact blob match on a ref — the rescued bytes are corroborated | **12** |
| no matching blob anywhere — the rescue is the only copy | **9** |

The 12 are provable: the bytes I copied are the bytes a commit holds. **The 9 are not, and cannot be.**
They existed only as working files inside a worktree, so there is no independent witness to compare against
and no way to show they are what the lane originally produced. For those nine the copy is the record.

## The pairing

| lane | file | durable path | provenance |
|---|---|---|---|
| `L-MEALS-XZ-CREDIT` | `zreport-kredittsalg.txt` | `docs/plan/evidence/L-MEALS-XZ-CREDIT/zreport-kredittsalg.txt` | `25586d86b` |
| `L-MRG-STARTER-150` | `evidence.md` | `docs/plan/evidence/L-MRG-STARTER-150/evidence.md` | **sole copy** |
| `L-MRG-WASTE` | `RUN.md` | `docs/plan/evidence/L-MRG-WASTE/RUN.md` | `8e1ad0755` |
| `L-EV-EXTDEP-GUARDS` | `EVIDENCE.md` | `docs/plan/evidence/L-EV-EXTDEP-GUARDS/EVIDENCE.md` | `072475364` |
| `L-MEALS-REQUOTE-RELEASE` | `evidence.md` | `docs/plan/evidence/L-MEALS-REQUOTE-RELEASE/evidence.md` | **sole copy** |
| `L-MRG-WASTE-500` | `RUN.md` | `docs/plan/evidence/L-MRG-WASTE-500/RUN.md` | **sole copy** |
| `L-WF-TIMESHEET-WIRE` | `evidence.md` | `docs/plan/evidence/L-WF-TIMESHEET-WIRE/evidence.md` | **sole copy** |
| `L-MEALS-EIGHTH-PIN` | `evidence.md` | `docs/plan/evidence/L-MEALS-EIGHTH-PIN/evidence.md` | **sole copy** |
| `L-MEALS-SUPERSEDE-SQL` | `evidence.md` | `docs/plan/evidence/L-MEALS-SUPERSEDE-SQL/evidence.md` | **sole copy** |
| `L-MEALS-QUOTE-RETRY` | `evidence.md` | `docs/plan/evidence/L-MEALS-QUOTE-RETRY/evidence.md` | **sole copy** |
| `L-CONFIRM-FAMILY-MERGE` | `RUN.md` | `docs/plan/evidence/L-CONFIRM-FAMILY-MERGE/RUN.md` | `38788369f` |
| `L-MEALS-EIGHTH-READ` | `evidence-2.md` | `docs/plan/evidence/L-MEALS-EIGHTH-READ/evidence-2.md` | `1995fb7fb` |
| `L-ROLLBACK-TRACKED-SWEEP` | `evidence.md` | `docs/plan/evidence/L-ROLLBACK-TRACKED-SWEEP/evidence.md` | **sole copy** |
| `L-WF-OPERATOR-UNIQUE` | `evidence.md` | `docs/plan/evidence/L-WF-OPERATOR-UNIQUE/evidence.md` | `c67d09238` |
| `L-CLOCKOUT-STATE-IS-NOT-OPEN` | `evidence.md` | `docs/plan/evidence/L-CLOCKOUT-STATE-IS-NOT-OPEN/evidence.md` | `6d5328004` |
| `L-SUPERSEDE-RELEASE-IS-ATTRIBUTED` | `evidence.md` | `docs/plan/evidence/L-SUPERSEDE-RELEASE-IS-ATTRIBUTED/evidence.md` | **sole copy** |
| `L-COMPOSE-AND-RUN-THE-STACK` | `compose-7ac6f2b2-sql-tier.trx` | `docs/plan/evidence/L-COMPOSE-AND-RUN-THE-STACK/compose-7ac6f2b2-sql-tier.trx` | `2e9ca93e4` |
| `L-BACKEND-PATCHES-ARE-APPLIED` | `evidence.md` | `docs/plan/evidence/L-BACKEND-PATCHES-ARE-APPLIED/evidence.md` | `6d5328004` |
| `L-LAND-THE-BACKEND-ON-THE-TRUNK` | `evidence.md` | `docs/plan/evidence/L-LAND-THE-BACKEND-ON-THE-TRUNK/evidence.md` | `6d5328004` |
| `L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY` | `L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY.md` | `docs/plan/evidence/L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY/L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY.md` | `e0ccd1036` |
| `L-THE-PRINTED-RECEIPT-NAMES-ITS-TENDER` | `PrintedTenderNameTests.cs` | `docs/plan/evidence/L-THE-PRINTED-RECEIPT-NAMES-ITS-TENDER/PrintedTenderNameTests.cs` | `bcc8bd179` |

## What this artifact does not settle

It does not say the durable copies *should* be cited — only that nothing today can. It does not compare the
9 uncorroborated files against anything, because there is nothing to compare them to. And the routing was
computed from the current `plan.md`; two evidence lines were rewritten by a verify sweep earlier tonight, so
a lane's citation may not be the one its author wrote.
