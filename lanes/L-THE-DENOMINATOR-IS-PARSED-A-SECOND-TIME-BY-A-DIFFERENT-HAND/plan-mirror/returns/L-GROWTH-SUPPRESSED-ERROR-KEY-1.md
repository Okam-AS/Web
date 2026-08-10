```
RETURN: L-GROWTH-SUPPRESSED-ERROR-KEY
brief: 02f45475
verdict: built
evidence: lanes/L-GROWTH-SUPPRESSED-ERROR-KEY/mutation-log.md
spec_gap: none
reason: complete
log:
Premise verified first, with a positive control: growth_error_test_address_required present 1/1/1 in no|en|de, growth_error_test_address_suppressed 0/0/0, and no ERROR_KEYS entry — only the fixture mentions the code.
Thrower is live: GrowthNewsletterService.cs:649, reached unconditionally at :278; four backend tests assert it.
Two backend facts changed the copy. The check is passed the value RequireOwnAccountAddressAsync RETURNS, so the suppressed address is the operator's OWN account address — "use a different address" is unactionable, since a test-send can only reach the account's confirmed address.
And there is no unsuppress: only never-liftable reasons refuse, the ledger is append-only, no lift route exists. So the sentence says retrying will never work and names the remedy that does — confirm a different address under «E-postadressen min», pinned to nav_account_email so a renamed screen cannot orphan it.
It names the class of block without asserting a reason, because neighbour-store AdminBlock and liftable Unsubscribe answer 200 and never reach this code.
Change: ERROR_KEYS entry + nb-NO (written first) + en + de + tests. No slot in any locale, so no address can be rendered (C7); mounted arm also asserts the rendered sentence omits the address, against a positive control that it was in play.
Proof is the rendered sentence, not the key: mountPage(RENDERED_NB) swaps the key-returning $i for the shipped nb-NO resolver and reads .growth-page__toast off the DOM.
Falsified twice. Remove the ERROR_KEYS entry -> red, Received: "Noe gikk galt. Ingenting ble sendt.". Remove only the nb-NO string -> red, Received: the ENGLISH sentence (translate falls back no->en->de) — the failure a key-level assertion cannot see.
Control arm kept: an unknown code still renders exactly growth_error_generic and must not contain «sperret».
test/growth-newsletter-page.test.js 38/38. Estate npx jest 2584 passed, 2 failed / 112 suites, core submodule initialised, no load errors.
The 2 failures are journey-artifact-store.test.js asserting /^Web-modules@/ against the worktree basename — proven pre-existing by reverting all five files and re-running that suite alone: identical 2 failed, 36 passed. Subject of lane/worktree-basename-pin.
eslint over the five changed files: 0 errors (3 pre-existing indent warnings ~3300 lines above any edit).
Fixture untouched; baseline is lane/fixture-suppressed-refusal 3d20451. Committed 775d45e on lane/fe-growth-suppressed-key. Nothing pushed, no container, no shared branch.
Adjacent CONSENT_SUMMARY reason-vocabulary defect named and left, per brief.
NOT verified: C5 — a mounted assertion is not Sven completing the journey. Also noted: estate total reads 2586, not the 2729 the dispatch note quoted, with all 112 suites loading.
END RETURN
```
