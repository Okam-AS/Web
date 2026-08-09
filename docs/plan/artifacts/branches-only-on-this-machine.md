# Branches that exist only on this machine

**Read-only census.** No ref was created, deleted, moved, pruned or fetched. Trunk `6d5328004`, unmoved.
The repair is named at the end and was not performed.

## The census, against the sample that prompted it

| | sample | census |
|---|---:|---:|
| lane branches cited as evidence | 20 | **98** |
| of those, no remote holds them | 8 | **47** |
| of those, merged into the trunk | not measured | **0** |
| cited SHAs resolving nowhere | 5 | **0** |

The sample's *rate* held — 8 of 20 against 47 of 98 — but two of its conclusions did not survive counting.

## There are no dead SHAs. There never were.

The five I reported were an artifact of my own hex regex. `766072d3` and `76b407d86aaf` are the two halves
of the session UUID `766072d3-8965-4c45-be67-76b407d86aaf`, split on a hyphen and read as commit ids; the
third, `a14e83ac504f04840`, is 17 characters — no git object is that length.

**Every cited SHA of commit length resolves in one of the two repos.** The sharpest part of the brief
dissolves on measurement: there is no lane whose proof is an unresolvable commit. Each claim touched by
those tokens also survives on other evidence in its own line, so nothing rested on them either way.

This is the fourth time tonight a sweep of mine was wrong in the same direction — a pattern matching more
than it should — and the third caught only by re-reading my own output rather than by the sweep failing.

## Cost, which is not the same as count

| tier | what a loss costs | count |
|---|---|---:|
| **1** | the branch is the **only** place a cited artifact lives — losing it loses the proof | **3** |
| **2** | unmerged work, but the cited artifact is readable elsewhere — losing it loses the *work*, not the record | **44** |
| **3** | merged into the trunk, a pointer only — loses nothing | **0** |

**Tier 3 is empty, and that is the finding.** Every local-only branch carries work that is not on the
trunk. None of these 47 is the harmless case the ranking was designed to separate out, so the reassuring
answer — *most of them are just pointers* — is unavailable.

## The 47

| branch | cited by |
|---|---|
| `lane/ef-index-shadow-sweep` | `L-EF-INDEX-SHADOW-SWEEP` |
| `lane/ev-accept-receipt` | `L-EV-ACCEPT-RECEIPT` |
| `lane/ev-extdep` | `L-EV-EXTDEP` |
| `lane/ev-inquiry-gate` | `L-EV-INQUIRY-GATE` |
| `lane/ev-journey-timebomb` | `L-EV-JOURNEY-TIMEBOMB` |
| `lane/ev-outbox-flake` | `L-EV-OUTBOX-FLAKE` |
| `lane/ev-outbox-guid-substring` | `L-EV-OUTBOX-GUID-SUBSTRING` |
| `lane/ev-uri-relative` | `L-EV-URI-RELATIVE` |
| `lane/ev-vipps-fallback-2` | `L-EV-VIPPS-FALLBACK` |
| `lane/fe-ev-inquiry-gate` | `L-EV-INQUIRY-GATE` |
| `lane/fe-wf-blind-bind-name` | `L-WF-BLIND-BIND-NAME`, `L-WF-LINK-DEADEND` |
| `lane/fe-wf-bootstrap` | `L-WF-BOOTSTRAP` |
| `lane/fe-wf-contact-imported` | `L-WF-CONTACT-IMPORTED` |
| `lane/fe-wf-link-deadend` | `L-WF-LINK-DEADEND` |
| `lane/fe-wf-oplink` | `L-WF-BLIND-BIND-NAME`, `L-WF-OPLINK` |
| `lane/flags-effective-resolvers` | `L-FLAGS-EFFECTIVE-RESOLVERS` |
| `lane/gr-approval-state` | `L-GR-APPROVAL-STATE` |
| `lane/gr-deadline-statute` | `L-GR-DEADLINE-STATUTE` |
| `lane/gr-postmark-webhook` | `L-GR-POSTMARK-WEBHOOK` |
| `lane/growth-health-honest` | `L-GROWTH-HEALTH-HONEST`, `L-REVIEW-RESIDUALS` |
| `lane/growth-newsletter-wire` | `L-GROWTH-NEWSLETTER-WIRE` |
| `lane/journey-workforce` | `L-JOURNEY-WORKFORCE` |
| `lane/meals-grace-pins` | `L-EV-ACCEPT-GATE` |
| `lane/meals-reachable-api` | `L-MEALS-REACHABLE` |
| `lane/meals-reachable-web` | `L-MEALS-REACHABLE` |
| `lane/price-crosscurrency` | `L-PRICE-CROSSCURRENCY` |
| `lane/review-residuals-provider` | `L-REVIEW-RESIDUALS` |
| `lane/review-residuals-rezone` | `L-REVIEW-RESIDUALS` |
| `lane/train-disclosure` | `L-TRAIN-DISCLOSURE` |
| `lane/train-evidence-pack-ui` | `L-TRAIN-EVIDENCE-PACK-UI` |
| `lane/train-publish-unclickable` | `L-TRAIN-PUBLISH-UNCLICKABLE` |
| `lane/train-readonly-visible` | `L-TRAIN-READONLY-VISIBLE` |
| `lane/trn-evidence-names` | `L-TRAIN-EVIDENCE-NAMES-COURSE` |
| `lane/utlkvit-reprint-kind` | `L-UTLKVIT-REPRINT-KIND` |
| `lane/wf-blind-bind-name` | `L-WF-BLIND-BIND-NAME`, `L-WF-LINK-DEADEND` |
| `lane/wf-bootstrap` | `L-WF-BOOTSTRAP` |
| `lane/wf-clock-wire` | `L-WF-CLOCK-WIRE` |
| `lane/wf-contact-imported` | `L-WF-CONTACT-IMPORTED` |
| `lane/wf-demo-presence` | `L-WF-DEMO-PRESENCE` |
| `lane/wf-digest-tautology` | `L-WF-DIGEST-TAUTOLOGY` |
| `lane/wf-idreg` | `L-WF-IDREG` |
| `lane/wf-link-deadend` | `L-WF-LINK-DEADEND` |
| `lane/wf-onboard-claim` | `L-WF-ONBOARD` |
| `lane/wf-push-still-lies` | `L-WF-PUSH-STILL-LIES` |
| `lane/wf-roles-ui` | `L-WF-ROLES-UI` |
| `lane/wf-timesheet-race` | `L-WF-TIMESHEET-RACE` |
| `lane/wf-timesheet-ui` | `L-WF-TIMESHEET-UI` |

## The repair, named and not performed

**Push them.** A branch on a remote survives this machine; nothing else these lanes cite does. It is one
command per branch and it is **not mine to run** — and not only for the usual reason:

- some of these branches carry evidence held tonight on an **open fødselsnummer ruling** — two `.trx` files
  containing a value that passes a date-aware MOD-11 check. Pushing them publishes that value to a remote,
  which is the decision being held, made by accident

- pushing is the act this program has withheld from every lane tonight, and doing it for 47 branches as a
  tidy-up would be the largest unreviewed change of the night

The narrow question for the owner is therefore not *should these be pushed* but **which of the 47 carry
evidence under an open ruling, and are they pushed last or never.**

## What this census cannot tell you

Whether a branch's unmerged work is still *wanted* — a branch may be superseded, and a superseded branch
costs nothing to lose. I measured reachability, not intent, and the two are not the same. Three of tonight's
lanes found branches that could not compile at the trunk; nothing here rules that out for the other 44.
