RETURN: L-TRAIN-EVIDENCE-PACK-UI
brief: 154d4325
verdict: built
evidence: commit af0a4a13 on refs/heads/lane/train-evidence-pack-ui; journey test/e2e/journeys/training-evidence-document.spec.js 18/18 green; full detail incl. what is NOT committed (artifacts/ is gitignored: journey JSON + 2 screenshots) in lanes/L-TRAIN-EVIDENCE-PACK-UI/NOTES.md
log:
Baseline e34977ac; backend checkout was on lane/meals-grace-pins so every fact was re-checked on feature/restaurant-modules.
Endpoint #16 = GET /training/stores/{storeId}/evidence?personRef=, StoreAdmin, camelCase wire, PascalCase enum strings.
Whole C3 wire in one commit: GetEvidence in training-client, utils/training/evidence.js, TrainingEvidenceDocument.vue,
pages/admin/training-evidence.vue, the AdminPageHeader sidebar entry, the STORE_ADMIN_PATHS pin. admin-nav-access 28/28 incl.
its converse walk ("every module page is offered by the sidebar") - the gate an unlinked page fails.
Disclosure claim verified BEFORE printing, 4 ways: GetEvidenceAsync ends in RecordDisclosureAsync (Append + SaveChangesAsync,
same request); the writer stages into the request's own DbContext; TrainingEvidenceReadTests reads the row back and proves a
2nd read makes a 2nd row, with a refused-read negative control; and the journey falsifies it live - 0 disclosures on arrival,
1 after one read (actor user-manager), 2 after two.
The journey CLICKS the sidebar link (not goto) and asserts the document names Ola Ansatt, Allergenhaandtering v1 and the date,
notice on screen before the button; it also pins arriving-records-nothing, no evidence.read in the chain, absent-person
named-empty. C6 held: no statute/section added. Fixed 2 defects seen only in the render: notice sat below the button it
warned about, and the NO nav label ellipsised. Sibling 1280px overlay defect does not recur - measured clear at 1280x720.
FINDING (backend, not mine): client GetDisclosures + TrainingDisclosurePanel call #17 evidence/disclosures, which has NO
handler on feature/restaurant-modules. Commit made by commit-tree+update-ref; HEAD never moved; index reset; not pushed.
END RETURN
