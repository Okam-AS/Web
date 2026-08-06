#!/usr/bin/env bash
#
# Run the demo script's join blocks against the stub. The bash executed here is CUT FROM THE REAL
# FILE by line range -- nothing is retyped, so a change to the script that breaks the join breaks
# this too. Usage: run-join-block.sh [MUT]
#
set -uo pipefail

SCRIPT="/Users/svendaneel/okam/wt-L-WF-ONBOARD/Scripts/demo/seed-workforce-demo.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MUT="${1:-none}"
PORT="${PORT:-4311}"

# The line ranges are resolved from the file's own anchors, so an edit that shifts the file cannot
# silently make this harness extract the wrong region.
l_helpers_a=$(grep -n '^say() {' "$SCRIPT" | cut -d: -f1)
l_helpers_b=$(grep -n '^die() {' "$SCRIPT" | cut -d: -f1)
l_api_a=$(grep -n '^api() {' "$SCRIPT" | cut -d: -f1)
l_check_end=$(awk 'NR>'"$(grep -n '^check() {' "$SCRIPT" | cut -d: -f1)"' && /^}$/ {print NR; exit}' "$SCRIPT")
l_5b_a=$(grep -n '^say "5b\.' "$SCRIPT" | cut -d: -f1)
l_5b_b=$(grep -n '^echo "   Nora claimed her own engagement' "$SCRIPT" | cut -d: -f1)
l_14b_a=$(grep -n '^say "14b\.' "$SCRIPT" | cut -d: -f1)
l_14b_b=$(grep -n '^echo "     \$SCHED_N published shift' "$SCRIPT" | cut -d: -f1)

for v in l_helpers_a l_helpers_b l_api_a l_check_end l_5b_a l_5b_b l_14b_a l_14b_b; do
    [ -n "${!v}" ] || { echo "HARNESS BROKEN: could not anchor $v" >&2; exit 2; }
done

MUT="$MUT" PORT="$PORT" node "$HERE/stub-api.js" >"$HERE/stub-$MUT.log" 2>&1 &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null' EXIT
for _ in $(seq 1 40); do grep -q '\[stub\] listening' "$HERE/stub-$MUT.log" 2>/dev/null && break; sleep 0.1; done
grep -q '\[stub\] listening' "$HERE/stub-$MUT.log" || { echo "stub never bound" >&2; exit 2; }

{
    echo 'set -euo pipefail'
    echo "API_BASE=http://127.0.0.1:$PORT"
    echo 'STORE_ID=42'
    echo 'WF="$API_BASE/workforce/stores/$STORE_ID"'
    echo 'MGR_TOKEN=manager-bearer-token'
    echo 'WRK_TOKEN=worker-bearer-token'
    echo 'WORKER_PHONE=+4790000001'
    echo 'NORA=11111111-1111-1111-1111-111111111111'
    echo 'NORA_PERSON=22222222-2222-2222-2222-222222222222'
    echo 'MON_C=2026-08-17; SUN_C=2026-08-23; NEXTMON_C=2026-08-24'
    sed -n "${l_helpers_a},${l_helpers_b}p" "$SCRIPT"
    sed -n "${l_api_a},${l_check_end}p" "$SCRIPT"
    sed -n "${l_5b_a},${l_5b_b}p" "$SCRIPT"
    sed -n "${l_14b_a},${l_14b_b}p" "$SCRIPT"
} > "$HERE/extracted-$MUT.sh"

MUT="$MUT" PORT="$PORT" bash "$HERE/extracted-$MUT.sh" >"$HERE/run-$MUT.out" 2>&1
echo "EXIT=$?"
cat "$HERE/run-$MUT.out"
