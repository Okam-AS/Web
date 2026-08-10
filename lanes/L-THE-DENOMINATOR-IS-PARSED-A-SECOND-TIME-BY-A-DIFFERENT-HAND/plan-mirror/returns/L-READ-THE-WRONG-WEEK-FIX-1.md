RETURN: L-READ-THE-WRONG-WEEK-FIX
brief: 149434d0
verdict: built
evidence: docs/plan/reviews/L-READ-THE-WRONG-WEEK-FIX.md
log: Verdict on lane/the-acknowledge-button-cannot-confirm-the-wrong-week acafde6: CLEAN — land it; the landing lane may proceed.
Before arm reproduced by state: my own read of the manager recipients endpoint shows A+B both acknowledged (16:02:28.188382 / 16:02:29.778514), matching the walk JSON to the microsecond.
After arm: both presses named cf05ec7d, second answered alreadyAcknowledged TRUE; week C carries NULL seen+ack and its own live Bekreft mottatt button — the act survives, only the accident is gone.
Mechanism confirmed whole for in-session presses: the only feed is publicationsForNotice, v-for keyed on inboxItemId, no poll exists, and a failed refetch nulls the inbox so no other week renders.
All eight mutations re-applied from their descriptions; M2:4 M3:1 M4:1 M5:1 M6:1 M7:2 M8:1 reds exactly as claimed; suites restored 53/53 between each.
M1 (trunk file, byte-identical) reds NINE not eight — the inverted case also reds; both exit-criterion cases red; the mis-count is in the safe direction and the union still covers all twelve.
Unstabilised ordering #1 (latent): a confirmed row a successful re-read omits is appended after reported rows; probe flipped newer/older. Exact change: return noticeOrder(shown.concat(missing)).
Unreachable today: GetInboxAsync returns every row for active engagements (no read filter, no window) and a failed re-read nulls the inbox — a named follow-up, not a blocker.
Unstabilised ordering #2: newest-first seats a publication published between the two presses at the pressed position; a row-set change, label-mitigated, named for the record.
Re-target over refuse HOLDS: refusal blocks the legitimate first confirmation of the second week and deletes the pinned idempotent-replay caller; a handler guard would be theatre.
Residuals correctly scoped; note the lede adjacency was introduced by this reorder (a confirmed row now sits under "Du har ikke åpnet denne ennå") — it wants its own flag.
E2e refusal RIGHT: the journey's world needs live-world.sh restarts its brief forbade; an unrun rewrite would be unfalsifiable. The gap (no two-publication e2e pin) must be tracked.
Deeper gap under every vector: a row never names the week it confirms (rows read only "Kom {time}"; both walks' rows identical to the minute) — week identity on the row is the missing piece.
Tier at tip: 166/3950/0 exit 0, no abort lines; eslint clean on the four touched files; web-livewalk verified read-only, byte-identical to acafde6 on all five files.
Worktree scratchpad/wt-ackreview removed (rm -rf + git worktree prune); nothing pushed, no port bound, no container touched, web-livewalk untouched.
END RETURN
