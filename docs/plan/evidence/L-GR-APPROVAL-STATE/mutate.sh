#!/bin/zsh
# Mutation harness for L-GR-APPROVAL-STATE: apply one edit to the projection, rebuild (never --no-build
# on a stale mtime), run the pins, record the real failure, restore.
cd /Users/svendaneel/okam/wt-gr-approval
SRC=Services/Growth/GrowthNewsletterService.cs
PRISTINE=lanes/L-GR-APPROVAL-STATE/pristine-service.cs.txt
OUT=lanes/L-GR-APPROVAL-STATE/mutations.txt
FILTER='FullyQualifiedName~GrowthApprovalStateWireTests|FullyQualifiedName~GrowthNewsletterLifecycleTests|FullyQualifiedName~GrowthIntegrationJourneyTests'

run_one () {
  local name="$1"; local from="$2"; local to="$3"
  cp "$PRISTINE" "$SRC"; touch "$SRC"
  python3 -c '
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path).read()
assert s.count(old) == 1, "anchor matched %d times: %r" % (s.count(old), old)
open(path, "w").write(s.replace(old, new))
' "$SRC" "$from" "$to" || { echo "$name: ANCHOR FAILED" >> "$OUT"; cp "$PRISTINE" "$SRC"; return; }
  touch "$SRC"
  if ! dotnet build WebApi.Tests/WebApi.Tests.csproj -v q 2>&1 | grep -qE "^ +0 Error"; then
    echo "$name -> BUILD FAILED (mutation does not compile)" >> "$OUT"; echo "" >> "$OUT"
    cp "$PRISTINE" "$SRC"; touch "$SRC"; return
  fi
  local log
  log=$(dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter "$FILTER" 2>&1)
  echo "=== $name" >> "$OUT"
  echo "    mutation: $from" >> "$OUT"
  echo "          ->: $to" >> "$OUT"
  echo "$log" | grep -E "^(Failed!|Passed!)" | head -1 | sed 's/^/    /' >> "$OUT"
  echo "$log" | grep -E "^  Failed WebApi|Assert\.[A-Za-z]+\(\)|Expected:|Actual:|KeyNotFound" | head -10 | sed 's/^/      /' >> "$OUT"
  echo "" >> "$OUT"
  cp "$PRISTINE" "$SRC"; touch "$SRC"
}

: > "$OUT"

run_one "M1 latest-not-first: chain order reversed" \
  "orderby approval.Id descending" "orderby approval.Id ascending"

run_one "M2 the two actors swapped" \
  "ApproverUserId = latest?.Approval.ApproverUserId,
                    ContentHash = latest?.Approval.ContentHash," \
  "ApproverUserId = latest?.Approval.InvalidatedByUserId,
                    ContentHash = latest?.Approval.ContentHash,"

run_one "M3 Revoked collapsed back into None" \
  ': latest.Approval.InvalidatedAt == null ? "Live" : "Revoked";' \
  ': latest.Approval.InvalidatedAt == null ? "Live" : "None";'

run_one "M4 Live collapsed into Revoked" \
  ': latest.Approval.InvalidatedAt == null ? "Live" : "Revoked";' \
  ': "Revoked";'

run_one "M5 approved version reported as the current one" \
  "NewsletterVersionNo = latest?.VersionNo," "NewsletterVersionNo = version.VersionNo,"

run_one "M6 approved wording reported as the current wording" \
  "ContentHash = latest?.Approval.ContentHash," "ContentHash = version.ContentHash,"

run_one "M7 the original scoping restored (approval history read against the CURRENT version)" \
  "where approvedVersion.NewsletterId == newsletter.Id" \
  "where approvedVersion.Id == version.Id"

run_one "M8 revocation time dropped (the field that was dead before this lane)" \
  "InvalidatedAt = latest?.Approval.InvalidatedAt," "InvalidatedAt = null,"

cat "$OUT"
