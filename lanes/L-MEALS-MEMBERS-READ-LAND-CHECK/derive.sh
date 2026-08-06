#!/bin/zsh
# Re-derives every figure in combinations.md. Read-only: no checkout, no fetch, no write
# to either repo. Every fact is read BY OBJECT (git show <ref>:<path>), never from a
# working tree -- the api checkout is on lane/meals-grace-pins and divergent, and reading
# it has manufactured false absences for four lanes today.
WEB=/Users/svendaneel/okam/Web-modules
API=/Users/svendaneel/okam/OkamAPI-modules
FRM_WEB=refs/heads/feature/restaurant-modules
FRM_API=refs/heads/feature/restaurant-modules
FE=refs/heads/lane/fe-meals-pretick-walked
BE=refs/heads/lane/meals-members-read
CAND=refs/heads/candidate/fe-compose-2026-08-05

echo "=============== F1. TIPS (nothing moved check) ==============="
for r in $FRM_WEB $FE $CAND refs/heads/lane/fe-meals-journey-locator refs/heads/lane/meals-enrol-pretick refs/heads/lane/meals-enrol-ui; do printf "  %-50s %s\n" "$r" "$(git -C $WEB rev-parse --short $r)"; done
for r in $FRM_API $BE; do printf "  %-50s %s\n" "$r" "$(git -C $API rev-parse --short $r)"; done

echo "=============== F2. AHEAD / BEHIND ==============="
echo "BE  ahead=$(git -C $API rev-list --count $FRM_API..$BE) behind=$(git -C $API rev-list --count $BE..$FRM_API)"
echo "FE  ahead=$(git -C $WEB rev-list --count $FRM_WEB..$FE) behind=$(git -C $WEB rev-list --count $FE..$FRM_WEB)"
echo "-- FE chain (oldest last) --"; git -C $WEB log --oneline $FRM_WEB..$FE

echo "=============== F3. IS 12R ON THE MERGE CANDIDATE'S BACKEND? ==============="
echo "-- verbs on FRM MealsProgramController --"
git -C $API show ${FRM_API}:Controllers/Meals/MealsProgramController.cs | grep -n 'Http\(Get\|Post\)'
echo "-- verbs on lane/meals-members-read --"
git -C $API show ${BE}:Controllers/Meals/MealsProgramController.cs | grep -n 'Http\(Get\|Post\)'
echo "-- refs in the api repo carrying the symbol --"
for r in $(git -C $API for-each-ref --format='%(refname)' refs/heads refs/lanes); do
  git -C $API grep -q ListProgramMembersAsync "$r" 2>/dev/null && echo "  $r"
done

echo "=============== F4. HOW MUCH OF THE PAGE WORKS ON FRM ==============="
echo "-- routes admin-client calls (lane tip) vs routes FRM binds --"
git -C $WEB show ${FE}:utils/meals/admin-client.js | sed -n '10,23p' | sed 's/^/  CALLS /'
for f in MealsProgramController MealsCompanyController MealsMembershipController; do
  git -C $API show ${FRM_API}:Controllers/Meals/${f}.cs | grep -n 'Http\(Get\|Post\)' | sed "s/^/  FRM $f /"
done

echo "=============== F5. DOES THE ENROL CONTROL EXIST ON FRM AT ALL? ==============="
for R in "$FRM_WEB" "$FE" "$CAND"; do
  n=$(git -C $WEB grep -c 'data-test="enrol' "$R" -- components/admin/meals/MealsProgramPanel.vue 2>/dev/null | sed 's/.*://')
  echo "  ${R}: enrol data-test hits = ${n:-0}"
done

echo "=============== F6. THE NOTE: REPLACED, NOT DELETED ==============="
for k in meals_enrol_no_read_note meals_enrol_unread_note; do
  for R in "$FRM_WEB" "$FE" "$CAND"; do
    printf "  %-26s %-45s " "$k" "$R"
    git -C $WEB show ${R}:translations/no.ts 2>/dev/null | grep -q "${k}:" && echo PRESENT || echo absent
  done
done

echo "=============== F7. THE THREE SENTENCES FE-ALONE PUTS ON SCREEN ==============="
git -C $WEB show ${FE}:translations/en.ts | grep -n 'meals_enrol_replaces_note\|meals_enrol_unread_note\|meals_refusal_absent'
echo "-- the middle one is unconditional (no v-if) --"
git -C $WEB show ${FE}:components/admin/meals/MealsProgramPanel.vue | sed -n '222,241p'

echo "=============== F8. WHY 'absent' AND NOT 'dark' FIRES ==============="
git -C $WEB show ${FE}:utils/meals/meals-client.js | sed -n '44,56p;83,88p'

echo "=============== F9. IS THE HALF-LANDING ALREADY STAGED? ==============="
git -C $WEB merge-base --is-ancestor refs/heads/lane/meals-enrol-pretick $CAND \
  && echo "  YES: lane/meals-enrol-pretick (note deleted + read called) IS IN $CAND" \
  || echo "  no"
git -C $WEB merge-base --is-ancestor $FE $CAND && echo "  (walk lane also in)" || echo "  (walk lane NOT in candidate)"
echo "-- web refs that call the read --"
for r in $(git -C $WEB for-each-ref --format='%(refname)' refs/heads refs/lanes); do
  git -C $WEB grep -q 'ListProgramMembers' "$r" -- utils/meals/admin-client.js 2>/dev/null && echo "  $r"
done

echo "=============== F10. WOULD ANY GUARD CATCH IT? ==============="
echo "  fixture-divergence.js lines at lane tip: $(git -C $WEB show ${FE}:test/e2e/fixture/fixture-divergence.js 2>/dev/null | wc -l | tr -d ' ')"
echo "  12R anchored there? $(git -C $WEB show ${FE}:test/e2e/fixture/fixture-divergence.js 2>/dev/null | grep -c 'programs/.*members')"

echo "=============== F11. THE OTHER PAIR (symmetry) ==============="
echo "wf FE ahead=$(git -C $WEB rev-list --count $FRM_WEB..refs/heads/lane/fe-wf-invite-list-revoke) behind=$(git -C $WEB rev-list --count refs/heads/lane/fe-wf-invite-list-revoke..$FRM_WEB)"
echo "wf BE ahead=$(git -C $API rev-list --count $FRM_API..refs/heads/lane/wf-invite-list-revoke) behind=$(git -C $API rev-list --count refs/heads/lane/wf-invite-list-revoke..$FRM_API)"
echo "-- the workforce frontend's failure mode when its routes are absent --"
git -C $WEB show refs/heads/lane/fe-wf-invite-list-revoke:pages/admin/workforce-roster.vue | grep -n 'Silent rather than a toast' -A3 -B6
git -C $WEB show refs/heads/lane/fe-wf-invite-list-revoke:pages/admin/workforce-roster.vue | sed -n '/async loadInvitations/,/^    },/p'
