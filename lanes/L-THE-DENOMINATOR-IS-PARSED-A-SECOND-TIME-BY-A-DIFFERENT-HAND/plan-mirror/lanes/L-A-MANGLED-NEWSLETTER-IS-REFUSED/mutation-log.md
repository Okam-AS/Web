# L-A-MANGLED-NEWSLETTER-IS-REFUSED — evidence

Branch `lane/a-mangled-newsletter-is-refused`, cut from backend trunk **`9fb057d00`**
("Land lane/the-two-documents-and-the-cart-get-tests onto the restaurant-modules trunk", the tip of
`feature/restaurant-modules`). Worktree `/Users/svendaneel/okam/wt-nlcontent`. No migration, no model
change, no SQL container, no frontend file touched.

## Tier accounting

| run | command | result |
| --- | --- | --- |
| baseline at `9fb057d00` | `dotnet test WebApi.Tests.csproj --filter "Database!=SqlServer"` from `WebApi.Tests/` | `Passed: 4880, Failed: 0, Skipped: 10, Total: 4890` |
| with the change | same | `Passed: 4921, Failed: 0, Skipped: 10, Total: 4931` |

Delta **+41**, and every one of the 41 is named below. Nothing else moved.

The tier command in circulation (`dotnet test` at the `OkamAPI-modules` root) exits 0 having run zero
tests — there is no `.sln` and the root csproj is not a test project. Both numbers above were read off a
`Passed: N, Total: T` line, not off an exit code.

> One tier attempt died mid-run with `The active test run was aborted. Reason: Test host process crashed`
> and STILL printed `Passed! - Failed: 0, Passed: 1017` — a false green worth knowing about. It did not
> reproduce: the new wire class passes alone (2/2), passes with its whole collection (7/7), and the clean
> re-run above completed 4931 with no abort. Log kept at `wt-nlcontent/after.log` (crash) and
> `after2.log` (clean).

## What the change is

`GrowthNewsletterService.RequireContent` checked `contentJson` was non-empty and stopped, so any bytes at
all stored with a 200. It now also runs `GrowthNewsletterBody.Inspect` (new file,
`Services/Growth/GrowthNewsletterBody.cs`) and refuses with a code and a sentence.

**The contract is taken from the readers, not from the column name.** Nothing in the estate parses this
value as JSON. Its only two production readers are `GrowthDispatchKeys.ContentHash`, which hashes any
string, and `GrowthMarketingFooter.AppendHtml`, which **concatenates the value unescaped into the mail's
`HtmlBody`** — a seam `GrowthMarketingFooter` itself documents ("the column is named `ContentJson` and the
dispatcher passes it straight to `HtmlBody`"). The three fixture families that write it disagree on a block
schema (`{type,value}`, `{type,text}`, bare strings) and every shipped client path — the admin textarea
labelled only "Innhold", its unit tests, all three Playwright journeys — types prose. A JSON rule would
have refused every draft the product can actually author.

So two refusals, both about what the mail path cannot render:

- `growth.content_unclosed_markup` — the body ends inside an unclosed comment, raw-text element or tag, so
  the mandatory unsubscribe footer appended after it is swallowed and never reaches the recipient. Nobody
  would find out: endpoint 14 returns a content fingerprint and never the body, and the admin page clears
  the box rather than showing it, so the next reader after the author is the guest's inbox.
- `growth.content_renders_nothing` — markup with no text and no image in it, so the mail arrives as the
  footer alone.

An unclosed `<p>`/`<div>` and a bare `<` in prose are **deliberately allowed**: the tag is terminated and
the footer after it is still markup, so refusing them would be taste rather than a reader's need.

## Mutation matrix — four mutants, each actually applied and rebuilt

| # | mutation | reds | greens |
| --- | --- | --- | --- |
| M1 | `RequireContent` stops calling `Inspect` (the trunk behaviour restored) | **15** — every refusal arm | 24 — every accept arm |
| M2 | an unclosed comment never faults | **2** — both comment arms only | 37 |
| M3 | `RendersNothing` never fires | **5** — the renders-nothing arms only | 34 |
| M4 | every body refused (the over-strict direction the brief warns of) | **32** — every accept arm | 7 |

M1/M2/M3 reds are **disjoint**, so each fault path is independently load-bearing and none rides another's
coverage. M4 is the inverse control: it proves the accept arms genuinely assert acceptance rather than
passing vacuously, which is what makes "refuse exactly what the readers cannot handle" falsifiable instead
of a claim in a commit message.

Restores were written through an editor (not `mv` of a `.bak`), so no `--no-build` staleness: each run
recompiled, and the restored suite returns to 39/39.

## The 41 added tests

**`WebApi.Tests/Growth/GrowthNewsletterBodyTests.cs` — 39 = 8 facts + 21 + 10 theory rows**

Eight `[Fact]`:

1. `Create_with_a_body_that_swallows_the_footer_is_refused_and_stores_nothing`
2. `Create_with_a_renderable_body_succeeds_and_stores_it_verbatim`
3. `Edit_with_a_body_that_swallows_the_footer_is_refused_and_appends_no_version`
4. `Edit_with_a_renderable_body_still_appends_the_next_version`
5. `A_body_a_recipient_would_see_nothing_of_is_refused_with_its_own_code`
6. `A_blank_body_keeps_answering_the_code_the_clients_already_map`
7. `The_refused_body_really_does_swallow_the_footer_the_dispatcher_appends` — runs the refused body through
   the REAL `GrowthMarketingFooter.AppendHtml` and pins that the opt-out URI lands after an unterminated
   `<!--` with no `-->` anywhere. It re-implements nothing, so it cannot pass by agreeing with the scanner.
8. `The_one_element_that_can_never_be_closed_is_not_answered_with_close_it`

`The_accepted_and_refused_bodies_differ_where_the_tokenizer_differs` — **21 rows** (11 refused, 10
accepted), in pairs that differ by about one character: `<div>Ny meny` accepted / `<div class="x` refused;
`Vi har plasser < 20 igjen` accepted / `Ny meny <p` refused; `<script>…</script>Ny meny` accepted /
`<script>…` and `<script>…</scriptural>` refused; `<style>…</style>Ny meny` accepted / `<style>…` refused;
`<textarea>…</textarea>` accepted / `<textarea>…` refused; `<!-- x -->Ny meny` accepted / `<!-- x` refused;
`<a href="https://x/?a=1>2">…</a>` accepted (a `>` inside a quoted attribute is not a tag end);
`<img …>` accepted, `<p>5 &lt; 10</p>` and `&aring;pent i kveld` accepted; `<div></div>`,
`<!-- bare et utkast -->`, `&nbsp;&nbsp;`, `<p><br></p>` refused as rendering nothing.

`Every_body_the_shipped_product_already_authors_is_still_accepted` — **10 rows**: `{"blocks":[]}`, `{}`,
`{"blocks":[{"type":"text","value":"nytt"}]}`, `{"blocks":["hello"]}`, the demo seed's `{type,text}` block
JSON, two Playwright prose bodies, `BODY OF A`, `C`, `<p>SYNTHETIC NEWSLETTER BODY</p>`. Each is also
asserted to be stored byte-for-byte.

**`WebApi.Tests/Wire/GrowthNewsletterBodyWireTests.cs` — 2**, over real HTTP through the controller,
the model binder and the `{error:{code,message,traceId}}` envelope:

40. `A_body_that_would_swallow_the_footer_is_refused_and_the_closed_one_is_stored` — POST → 400
    `growth.content_unclosed_markup`; the newsletter list read back through endpoint 12 is **unchanged**;
    the next POST, differing only in that the comment closes, → 200 and appears in that list. This is the
    lane's exit criteria as one request refused and one accepted.
41. `A_body_a_recipient_would_see_nothing_of_is_refused_with_its_own_code_over_http` → 400
    `growth.content_renders_nothing`.

Three assertions deliberately guard against the traps this estate has shipped before: the "stores nothing"
checks are **deltas over a populated table** (the harness world seeds a newsletter and a version, so
`Assert.Empty` would have been an empty-haystack assertion and would have failed outright), the refusal
message is asserted to **contain the construct and its position but NOT the authored body** (C7 — an error
string is a response body and a log line waiting to happen), and `<plaintext>` is asserted **not** to be
answered with "close it", because no parser ever closes that element and "close it" would be an
instruction no edit could satisfy.

## Constraints

- **C1** — no UPDATE or DELETE anywhere; the change only refuses writes earlier than they used to be made.
- **C2** — no migration, no `OnModelCreating` change, no snapshot touched.
- **C3** — no new service, route, flag or page. The check sits inside `CreateDraftAsync` and
  `EditDraftAsync`, both already wired to `GrowthNewslettersController`; both call sites are covered by
  their own test, since a fix wired into only one would leave the other storing the same body.
- **C4** — not a money path.
- **C6** — no operator-facing string names a statute; the statutory rationale is a code comment only.
- **C7** — the refusal carries a construct name from a closed set and an integer offset, never the body.

## Owed follow-up, not done by this lane

`pages/admin/growth-newsletter.vue:252` maps `growth.*` codes to copy and falls back to
`growth_error_generic` ("Something went wrong.") for anything unmapped. The two new codes need
`ERROR_KEYS` entries plus `growth_error_content_unclosed_markup` / `growth_error_content_renders_nothing`
in `translations/{en,no,de}.ts`, or the admin screen will render a precise server refusal as
"Something went wrong." That file's own comment states the ordering rule and says mapping early is the
safe direction. Not done here because this lane's workdir is `../OkamAPI-modules`, the frontend edit would
have to land in the shared `Web-modules` checkout other lanes are using, and a Web-modules worktree cannot
run the jest suite without an install this brief forbids.
