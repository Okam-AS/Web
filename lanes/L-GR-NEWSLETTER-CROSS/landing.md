# F-GR-NEWSLETTER-CROSS — the landing half, prepared and validated at the current tip

The lane may not merge to `feature/restaurant-modules`. This is the landing
prepared, re-validated against the tip as it stands today, and offered for
whoever performs merges. **Nothing was pushed. No container was started. No SQL
tier was run.** Every claim below was measured, and every ref is named.

## The refs

| what | ref |
|---|---|
| integration tip | `8e2b57de` = `feature/restaurant-modules` (`git rev-parse` — the two are the same commit) |
| the proof | `87600a1c` on `lane/growth-newsletter-wire` |
| prepared merge | `2fc29f34` on `lane/gr-newsletter-cross-land`, worktree `/Users/svendaneel/okam/wt-gr-nlcross` |
| repo | `/Users/svendaneel/okam/OkamAPI-modules` (bare-shared) |

The backend checkout at `OkamAPI-modules` is on `lane/meals-grace-pins`, so
**every source claim here was read with `git show 8e2b57de:<path>`**, never from
the working directory (`F-PROBE-ROOT-WRONG-WORLD`).

## The proof is real and unlanded

    git merge-base --is-ancestor 87600a1c 8e2b57de   -> exit 1   (NOT an ancestor)
    git show --stat 87600a1c
      WebApi.Tests/Wire/GrowthNewsletterAuthoringWireTests.cs | 439 ++++++
      1 file changed, 439 insertions(+)

Test-only, one file, one commit. It is the whole unlanded delta.

## The merge is conflict-free and adds exactly that one file

    git merge-tree --write-tree 8e2b57de 87600a1c   -> exit 0, tree 9ac81af9
    git diff --stat 8e2b57de 9ac81af9
      WebApi.Tests/Wire/GrowthNewsletterAuthoringWireTests.cs | 439 ++++++

`2fc29f34` is that merge made for real (`--no-ff`, ort, zero conflicts); its
diff against `8e2b57de` is the same single file. No production file moves.

## Re-validated at THIS tip, not the one the first run measured

The first run validated against `3579bbbc`. The tip has moved **59 commits /
227 files** since, and two of them are `Controllers/GrowthNewslettersController.cs`
and `Services/Growth/GrowthNewsletterService.cs` — the exact subjects. So the
green was re-established rather than inherited.

    dotnet build WebApi.Tests    0 errors
    6/6 PASS   GrowthNewsletterAuthoringWireTests   (container-free wire tier)

## The proof is still load-bearing at this tip — mutation re-run here

The mutation is the flag's own shape: guard called, answer discarded, on the
four authoring actions only. `List`, `TestSend` and `Dispatch` untouched;
`TestSend`/`Dispatch` carry a different composite guard and were not candidates.

    Controllers/GrowthNewslettersController.cs l.81/101/121/164
      -  if (!await AuthorizeStoreAsync(storeId))
      +  await AuthorizeStoreAsync(storeId); if (false)

    WebApi.dll        11:18:02 -> 11:19:19   (moved)
    WebApi.Tests.dll  11:18:14 -> 11:18:14   (did NOT move)

...which confirms the edited assembly is the production one: a controller edit
does not move the test dll's mtime.

    4/6 FAIL   GrowthNewsletterAuthoringWireTests
               Expected: NotFound / Actual: OK  on create, detail, edit, approval
    15/15 PASS GrowthTenantIsolationTests        — in the SAME mutated build

That second line is the root finding reproduced at the current tip: the
pre-existing cross-tenant suite stays fully green while a venue admin can read,
edit and **approve** another venue's newsletter. The new proof is the only thing
that reds.

Restored (`git checkout --`, 5/5 guard lines back), rebuilt 0 errors, re-ran
**6/6 PASS**, worktree `git status --porcelain` empty.

## What remains, and who does it

Merge `lane/growth-newsletter-wire` (or take `2fc29f34` directly) into
`feature/restaurant-modules`. It is test-only, one file, zero conflicts, green
and mutation-proven against the tip it would land on. That merge is not this
lane's to make.
