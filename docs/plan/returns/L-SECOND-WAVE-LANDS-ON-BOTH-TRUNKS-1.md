RETURN: L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS
brief: e78ec33c
verdict: built
evidence: /private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/L-SECOND-WAVE-LANDS-ON-BOTH-TRUNKS/backend-landing-receipt.md
log:
TIPS for the queued world-rebuild lane: frontend feature/restaurant-modules = 42a44de5, backend = a14084874. Nothing pushed. Reverts: FE ff497c0, BE 118f92fb9.
All five named branches merged, ZERO conflicts. Not luck: each repo's lane file sets are pairwise disjoint, checked before merging, so git merge-file was never reached.
FE merged: every-starter-resumes 894a3b9, wf-invite-pair-fe ff74b10, demo-on-another-machine ba2016f. BE merged: wf-invite-pair-be 13e8a6213, an-acceptance 86142430c.
wf-invite-pair-fe landed at ff74b10, NOT the 698383c the brief named: the branch had moved on one commit. Re-checked as instructed rather than trusting the sha.
Brief correction: only an-acceptance-names-somebody sits on the old trunk 8e2b57de8; wf-invite-pair-be forks two commits below the tip, not 48, so no rebase was owed.
Invite pair landed on BOTH sides, so L-WFR-ACCESS-STRING-TRUTH holds. FE calls GET /workforce/stores/{id}/invitations and POST .../revoke; the BE controller binds both.
FE jest at the tip: 145/145 suites, 3216/3216 tests, 0 failed. Baseline 3192 plus 11 plus 13 = 3216, so every test is accounted for and none is unexplained.
BE build 0 errors. Non-SQL tier 4752 passed / 0 failed / 10 skipped against baseline 4736/0/10. The plus-16 is named by attribute: 13 Facts, 2 Facts, 1 MemberData row.
BE SQL tier NOT COMPLETED, recorded as such and not as green. Attempt 1 died at 317 of ~694, "Test host process crashed", another lane's SQL tier sharing the VM, swap full.
Attempt 2 ran on a quiet host, got roughly twice as far, then was killed from outside before printing a result. About half the tier stays unmeasured and wants a re-run.
The only failure in either attempt is the known-red SchedulePublish outbox count (expected 1, actual 2), gated on a ruling. No file in the BE delta touches schedule or outbox.
HARNESS TRAP: a fresh worktree leaves the core submodule empty, so 15 jest suites fail to RESOLVE while jest still exits 0. First run read 2915 until core was pinned at 9626a561.
10 SQL containers started, each capped at max server memory 1536MB keyed on this lane's Testcontainers session ids. okam-lwtwo-sql and redis carry no such label, still up.
wt-landbackend (prior wave's worktree, clean at 118f92fb9) held the trunk ref and blocked branch -f. Detached in place, files byte-identical. My wt-l2w-fe and wt-l2w-be removed.
REFUSED: preserve/german-identifier-labels bfa1992, preserve/model-versus-chain-drift-test 66f19e236. OUTSTANDING: lane/ore-padding-operator-clients on Web c3695f1 + AdminApp 9b8632c.
END RETURN
