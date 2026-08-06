# L-GR-EXIT-IS-LINKED — the exit is already linked; here is the proof that was missing, and why the flag stays open

verdict: **fail-spec**. Not because the brief is wrong about the tip, but because it directs a **build** of
something that was already **built** 37 hours before the brief was generated. Following it literally would
have forked five files another lane already owns.

## 1. What the brief says, and where each claim is true

| brief claim | true at | false at |
| --- | --- | --- |
| zero product-code references to `/preferences/unsubscribe` | backend integration tip `feature/restaurant-modules` **8e2b57de** | `lane/gr-exit-wire-the-mail` **54a8bb51** |
| the page says so about itself | `Web-modules` HEAD, `pages/preferences/unsubscribe.vue:98,102` | `lane/fe-gr-exit-wire-the-mail` **814f04d**, where both sentences are deleted and replaced with a description of the two entry paths |

Both refs read with `git show "${ref}:path"`. The integration tip has **not moved since 2026-08-04 12:00:29
+0200**; `git merge-base --is-ancestor 54a8bb51 feature/restaurant-modules` → **NOT MERGED**.

## 2. The dates, which are the whole finding

The plan's own decision names this discriminator — *compare each flag's fix-commit date against its ruling
date* — and says the board "reads as forty-seven things to build; most of them are things to land." This lane
is that sentence happening again, to the lane that wrote it.

| event | when |
| --- | --- |
| `F-GR-NO-EXIT-FROM-A-LIST` raised | 2026-08-04T13:58Z |
| `L-GR-EXIT-WIRE-THE-MAIL` started | 2026-08-04T18:18Z |
| remedy committed (`cd406b2d`, `54a8bb51`) | 2026-08-04 21:14 / 21:22 +0200 = **19:14 / 19:22Z** |
| `L-GR-EXIT-WIRE-THE-MAIL` returned **built** → `built-unverified` | 2026-08-04T19:24Z |
| **this brief generated** | **2026-08-06T08:14Z** |
| this lane started | 2026-08-06T08:15Z |

The flag still records `cleared_by: L-GR-EXIT-IS-LINKED` and its body still states blocker (a) as current.

## 3. The remedy, read at the ref rather than taken from a return

`GrowthDispatchService.cs:480` composes the exit from the **same** unsubscribe token the RFC 8058 header
carries, in the same pre-`Submitting` fail-closed window, and passes it to both body alternatives at `:512`
and `:513`. `GrowthMarketingFooter` renders it as a second link beside the preference centre in **both** the
HTML and plain-text parts — a footer present only in the HTML part is absent for every plain-text reader.
The token rides the **fragment** (`#token=`), never the query, so a browser never transmits it.

## 4. The one thing the exit demanded that had NOT been done — and now has

The sibling lane ran two mutations (`Redirect(target)` for C7, and repointing the capture host). **Neither is
the mutation this lane's exit demands.** Nothing had ever shown these tests red for the reason that matters:
*delete the link the dispatch actually composes*. A test never shown to red is indistinguishable from one
that matches nothing.

Worktree: `git worktree add --detach /Users/svendaneel/okam/wt-gr-exit-linked 54a8bb51` (detached — the
branch is checked out elsewhere and was not disturbed). Removed after the run; the proof reproduces from
`54a8bb51` in ~30 s.

Mutant, applied to `Services/Growth/GrowthDispatchService.cs`:

```
-            var unsubscribePageUri = GrowthUnsubscribePageLink.BuildUri(_settings, unsubscribeToken);
+            // MUTANT L-GR-EXIT-IS-LINKED: the composed exit link is deleted.
...
-                GrowthMarketingFooter.AppendHtml(context.ContentJson, preferenceCentreUri, unsubscribePageUri),
-                GrowthMarketingFooter.AppendPlainText(context.PlainTextAlternative, preferenceCentreUri, unsubscribePageUri),
+                GrowthMarketingFooter.AppendHtml(context.ContentJson, preferenceCentreUri, null),
+                GrowthMarketingFooter.AppendPlainText(context.PlainTextAlternative, preferenceCentreUri, null),
```

`dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter "FullyQualifiedName~GrowthUnsubscribeExitReachabilityTests"`

| arm | result |
| --- | --- |
| baseline `54a8bb51` | **Failed: 0, Passed: 5** |
| composed link deleted | **Failed: 5, Passed: 0** |
| restored (sha `85e548c3…` re-matched, `git status` clean) | **Failed: 0, Passed: 5** |

The **set** of names that went red, not a delta of totals — all five, and the messages discriminate:

```
Every_dispatched_message_carries_the_session_free_unsubscribe_link_in_both_bodies   Assert.Contains() Failure
The_footer_keeps_the_preference_centre_link_as_well_as_the_new_exit                 Assert.Contains() Failure
The_exit_link_carries_the_unsubscribe_token_and_never_the_stronger_preference_token "The message body carries no session-free unsubscribe link."
The_exit_token_rides_the_fragment_so_it_cannot_reach_a_server_log                   "The message body carries no session-free unsubscribe link."
A_recipient_who_spends_the_footer_exit_is_suppressed_on_the_next_campaign           "The message body carries no session-free unsubscribe link."
```

The last one is the one worth having: it is the **outcome** test — dispatch, read the link out of the body,
spend it, advance past the 7-day cap, dispatch again, leaver `Suppressed` while the control recipient stays
`ProviderAccepted`. Deleting the composed link reds the *withdrawal outcome*, not merely a string match.

**The stale-binary trap was live here and was avoided by measurement.** `WebApi.Tests.dll` mtime does **not**
move when only `WebApi` sources change, so the obvious check is the wrong one — the assembly that carries the
mutant is `bin/Debug/net8.0/WebApi.dll`. Mutant build 10:20:0x; restore `cp` + `touch` → source 10:20:29 →
rebuild 10:20:46, i.e. compiled *after* the restored source. Every `--no-build` number above is against the
binary it claims.

## 5. My half alone does NOT clear the flag — and this half is now measured, not inherited

`GrowthSettings.cs:76` defaults `UnsubscribePageBaseUrl` to `https://okam.no/preferences/unsubscribe`, and
`GrowthDispatchService` prints it in **every** send. Probed read-only just now:

```
https://okam.no/preferences/unsubscribe     -> 404
https://okam.no/preferences/communications  -> 404
https://okam.no/                            -> 200
```

The site is up; the routes are not deployed. So **the second clause of this lane's own exit — "the page it
names resolves from that address with no session" — is false today**, and no agent action can make it true:
it needs a shared-branch merge and an API deploy (`D-PREFCENTRE-DEPLOY`, `L-PREFCENTRE-DEPLOY-EXEC`).

**This is the C6 hazard at its sharpest, and landing the remedy without the deploy makes it worse, not
better.** Today the message prints no withdrawal address at all. Land `54a8bb51` and switch mail on, and every
message prints a statutory art. 7(3) withdrawal address that answers **404** — a missing feature converted
into a broken promise on the one path an inspector would walk. `L-GROWTH-PREFCENTRE` already recorded this as
*no real Growth mail may leave until main lands*; it is held by configuration (`appsettings.json` pins
provider `Fake`, `Enabled:false`) and by nothing structural.

Blocker (b) of the flag — the preference centre cannot open a session cross-origin — is untouched by all of
this and is separately owner-owned.

## 6. What I did not do

No push. No commit to any branch, shared or otherwise. No production write — the three probes above are
`GET`s against a public host. No container started or touched. No migration. No `npm ci`/`npm install`. No
`git stash`. Nothing in any tree I did not create, and the detached worktree was removed with its tree clean
and the file sha re-matched. No token or credential appears in this file (C7) — the sibling lane's capture
holds one and is deliberately not reproduced here.

C5 is **not** claimed: nothing here is verified or accepted. No person has walked the deployed journey,
because the address 404s.

## 7. Recommendation

1. **Do not re-dispatch this lane as a build.** Retire it into `L-GR-EXIT-WIRE-THE-MAIL`, whose work it
   duplicates, and carry §4 above as that lane's missing mutation.
2. **The remaining work on blocker (a) is landing, not building**: `54a8bb51` onto
   `feature/restaurant-modules`, and `814f04d` onto the frontend candidate.
3. **Sequence matters and is a C6 obligation**: the deploy of `/preferences/unsubscribe` must not lag the
   landing of the footer link into any environment that can send mail.
4. Update `F-GR-NO-EXIT-FROM-A-LIST` — blocker (a) is remedied-unlanded, not open-unbuilt.
