```
RETURN: L-A-MANGLED-NEWSLETTER-IS-REFUSED
brief: 84ac012a
verdict: built
evidence: docs/plan/lanes/L-A-MANGLED-NEWSLETTER-IS-REFUSED/mutation-log.md
log:
Branch lane/a-mangled-newsletter-is-refused @ 2b926adab, worktree ~/okam/wt-nlcontent, off backend trunk 9fb057d00. Not pushed. No migration, no SQL container, no frontend file touched.
RequireContent checked non-empty and never looked further, so any bytes stored with a 200. It now runs GrowthNewsletterBody.Inspect and refuses with a code and a sentence naming the construct.
Validity comes from the READERS: nothing here parses it as JSON. They are ContentHash, which hashes anything, and GrowthMarketingFooter.AppendHtml, which concatenates it unescaped into HtmlBody.
A JSON schema would refuse every draft the product can author: the admin box is a textarea labelled "Innhold", its tests send 'C', the journeys type prose, and the fixtures disagree on a block schema.
growth.content_unclosed_markup: the body ends inside an unclosed comment, raw-text element or tag, so the mandatory unsubscribe footer concatenated after it is swallowed in every mail client.
growth.content_renders_nothing: markup carrying no text and no image, so the mail arrives as the footer alone. The old check answered 200 to "<div></div>".
Unclosed <p>/<div> and a bare '<' in prose stay ACCEPTED: the tag is terminated and the footer after it is still markup. The line drawn is the HTML5 tokenizer's, pinned by paired accept/refuse rows.
Exit criteria over real HTTP: a POST with an unclosed comment answers 400 growth.content_unclosed_markup and leaves the list unchanged; the same body with --> added answers 200 and joins that list.
Added 41 tests: 39 in WebApi.Tests/Growth/GrowthNewsletterBodyTests.cs, 2 in WebApi.Tests/Wire/GrowthNewsletterBodyWireTests.cs. Both RequireContent call sites are proved separately.
Mutants, each applied and rebuilt: M1 drop Inspect reds 15 of 39, every refusal arm; M2 comment never faults reds 2; M3 renders-nothing never fires reds 5. The three red sets are DISJOINT.
M4 refuse-every-body reds 32, every accept arm, which is what shows the accept arms assert acceptance rather than passing vacuously.
Fast tier from WebApi.Tests/ (Database!=SqlServer): baseline at 9fb057d00 was 4880/0/10 of 4890; with the change 4921/0/10 of 4931. Delta +41, each one named in the evidence file.
One tier attempt printed "Passed! 1017" AFTER "test run was aborted: test host process crashed" — a false green. It did not reproduce; the clean re-run reached 4931 with no abort.
Reverted artifacts/journeys/ev-dietary/run-sheet.json: another suite's wire test rewrites its timestamps on every run, so it is not part of this delta.
OWED: growth-newsletter.vue:252 falls back to growth_error_generic, so admin renders both refusals as "Something went wrong." until ERROR_KEYS plus en/no/de strings land. Outside this lane's workdir.
END RETURN
```
