# Item 3 FE (lane/statute-evidence-world + lane/ev-stale-cause) — REFUSED, with the measurement

Trial merge of lane/statute-evidence-world onto the FE trunk at 3ff7f07 (after items 1 and 2 landed).
Conflicts: 6 files. Nine of the eleven hunks are clean add/add and were resolved; two are not.

## Blocker A — two fixture worlds for one route (test/e2e/fixture/api-server.js)
Both sides define `if (rest === '/personnel-list' && req.method === 'GET')`:
  trunk : return send(res, 200, personnelListFor(storeId, url.searchParams.get('businessDate')));
          -- built over world.PERSONNEL_ROWS / PERSONNEL_BUSINESS_NAME / PERSONNEL_ORGNR,
             landed THIS pass with lane/wf-kodeoversikt-ui and its browser journey.
  lane  : return send(res, 200, world.personnelList(storeId, asked));
          -- a separate self-contained world function with its own BUSINESS_NAME /
             ORGANIZATION_NUMBER / retainUntilUtc / correctionActorReference rows.
The lane also re-declares /staff and /roles as one-liners the trunk already serves in richer form
(the trunk's block additionally carries /personnel-list/code-register, /attendance, /invitations
and roles PUT). A route can serve one world; either choice silently breaks the other lane's
browser journey, and this branch has no browser-level run in this lane's budget to tell which.

## Blocker B — the lane's wfpl_identity_gap would take back a C6 claim
Both sides define wfpl_identity_gap in translations/{no,en,de}.ts. The trunk's copy was rewritten
one merge ago, when the kodeoversikt button landed, and now says the code overview is downloaded
from the personalliste page. The lane's copy predates the button and says Okam 'fører ingen slik
kodeoversikt'. Taking the lane's sentence would print a claim the tree can now disprove.
(The lane's NEW key wfpl_category_gap is additive and true; it is not the blocker.)

## Not the blocker
The other nine hunks resolved cleanly as add/add: the ev_runsheet_* keys, the print-host class in
pages/admin/workforce-personnel-list.vue, and three world.js blocks with disjoint symbol sets.

Stages kept at: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-SEEDS-AND-THE-STATUTORY-TOP-LAND/conflicts/statute-evidence-world
