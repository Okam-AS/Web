# What a guest sees when a month-old proposal link is opened

Read-only measurement plus one mutation, applied and restored. Nothing was repaired; no expiry, cleanup job
or ceiling was added. Backend `feature/restaurant-modules` @ `28e60e6b8`, frontend read at the working tree.

## First, a correction to the finding that opened this lane

The sibling lane — mine — reported that a month-old link *"lands on a refusal rather than a stale price."*
**That is not what happens, and the truth is better.**

`EventsProposalService.GetPublicAsync` (`:367-386`) does **not** throw for a superseded version. It loads
the version, computes `isActionable = version.Status == Sent && notExpired` — false here — and returns the
view. The guest gets **HTTP 200 and the page**, showing the figures as they were sent, with no accept
control.

`ProposalSuperseded()` is thrown at `:415` and `:503`, which are the **accept** and **decline** paths. A
guest who opens the link never reaches them; the 409 is the backstop for someone posting anyway.

So the shape is: *the read succeeds and explains itself; the write refuses.* The page comment names the
intent exactly — "the whole point of answering a superseded token with its own version rather than a 404."

## The sentence the guest actually reads, verbatim

Rendered by `pages/events/proposal/_token.vue`, which selects a stance from the server's `status` and shows
it in the `[data-test="closed"]` region.

**Norwegian** — heading `ev_guest_stance_superseded_heading`, body `ev_guest_stance_superseded_body`:

> **Det finnes et nyere tilbud**
>
> Stedet har sendt et nytt tilbud etter dette, så dette kan ikke godtas lenger. Under står tallene slik de
> sto da du fikk dem. Bruk den nyeste lenken du har fått, eller ta kontakt med stedet.

**English:**

> **There is a newer offer**
>
> The venue has sent a new offer since this one, so this one can no longer be accepted. The figures below
> are as they stood when you got them. Use the newest link you were sent, or get in touch with the venue.

**German:**

> **Es gibt ein neueres Angebot**
>
> Das Lokal hat danach ein neues Angebot geschickt, deshalb kann dieses nicht mehr angenommen werden. Unten
> stehen die Zahlen so, wie Sie sie erhalten haben. Nehmen Sie den neuesten Link, oder melden Sie sich beim
> Lokal.

It is not an untranslated 500, not a raw enum name and not a bare error. It names the reason, says the
figures shown are historical, and tells the guest what to do next. A status the page has no sentence for
falls back to `ev_guest_status_verbatim` — *"Status hos stedet: {status}"* — shown beside a neutral
sentence rather than swallowed.

The server carries the reason on the wire as well: `EventsPublicProposalView.Status` is the version status
as a string, alongside `IsActionable`, so the page is selecting on a fact rather than inferring one. The
409 backstop carries `EVENTS_PROPOSAL_SUPERSEDED`, detail *"This proposal version has been superseded by a
newer version."*, and `conflictKind = proposal-superseded`, `retryable = false`.

## Is the reason pinned, or only the refusal?

**Pinned — by two arms, and only one of them is the one that matters.**

| arm | what it holds |
|---|---|
| `events-guest-pages.test.js` — *a superseded token shows what was sent and says so, with no accept control* | the heading is in `[data-test="closed"]`, the body is in the text, no accept button and no primary control |
| `events-guest.test.js` — *the closed-offer sentences are all distinct in all three languages* | the superseded, expired, accepted and declined bodies are mutually distinct in `no`, `en` and `de` |

## The mutation, and which arm caught it

**Mutation:** the Norwegian `ev_guest_stance_superseded_body` was replaced with the Norwegian
`ev_guest_stance_expired_body`. The refusal survives untouched — the page still closes, still shows no
accept control, still displays a sentence. **Only the reason is lost:** a guest whose offer was superseded
is told it expired.

| run | suites | executed | passed | failed |
|---|---|---:|---:|---:|
| clean | 2 | 70 | 70 | 0 |
| superseded body degraded to the expired body | 2 | **70** | 69 | **1** |

The executed count is identical, so this is a real kill rather than a run that executed nothing.

**The one that red is `the closed-offer sentences are all distinct in all three languages`.**

**The page arm stayed green** — which is the whole point of the lane. It asserts that the superseded body
*appears*, and after the mutation a body still appears; it is simply the wrong one. An arm that pins the
refusal cannot see a reason degrade. The distinctness arm is what protects it, and it protects the
expired, accepted and declined sentences by the same stroke.

## Verdict

**The refusal already names its reason, and an arm already pins it.** Nothing was added. The gap this lane
was convened to find does not exist on this path — but it existed in the *description* of the path, which
is why the correction at the top of this file is the useful output.

## What this does not cover

The German and English bodies were not mutated individually; the distinctness arm iterates all three
locales, so one mutation exercises the rule rather than each translation. No backend tier was run — the 409
backstop's code and detail were read, not executed. The drain and the email adapter were not examined here;
a sibling established that neither checks a row's age, and this lane did not reopen it. Whether a guest has
ever met this page in production is unknown to this lane.
