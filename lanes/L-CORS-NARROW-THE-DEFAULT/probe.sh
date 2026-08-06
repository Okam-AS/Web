#!/bin/zsh
# Side-by-side CORS probe: deployed API vs. the locally hosted build.
# Read-only. Only OPTIONS preflights and unauthenticated GETs. No credential is ever sent.
set -u
DEPLOYED="https://api.okam.no"
LOCAL="http://127.0.0.1:5391"

probe() {
  local base="$1" method="$2" route="$3" origin="$4" acrm="$5" acrh="$6"
  local -a args
  args=(-s -o /dev/null -D - -m 15 -X "$method" -H "Origin: ${origin}")
  [[ -n "$acrm" ]] && args+=(-H "Access-Control-Request-Method: ${acrm}")
  [[ -n "$acrh" ]] && args+=(-H "Access-Control-Request-Headers: ${acrh}")
  local out
  out="$(curl "${args[@]}" "${base}${route}" 2>/dev/null)"
  local code acao acah acac
  code="$(print -r -- "$out" | awk 'NR==1{print $2}')"
  acao="$(print -r -- "$out" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{gsub(/\r/,"");print $2}')"
  acah="$(print -r -- "$out" | awk -F': ' 'tolower($1)=="access-control-allow-headers"{gsub(/\r/,"");print $2}')"
  acac="$(print -r -- "$out" | awk -F': ' 'tolower($1)=="access-control-allow-credentials"{gsub(/\r/,"");print $2}')"
  printf '%s|%s|%s|%s|%s\n' "${code:--}" "${acao:-<none>}" "${acah:-<none>}" "${acac:-<none>}"
}

row() {
  local label="$1" method="$2" route="$3" origin="$4" acrm="$5" acrh="$6"
  local d l
  d="$(probe "$DEPLOYED" "$method" "$route" "$origin" "$acrm" "$acrh")"
  l="$(probe "$LOCAL"    "$method" "$route" "$origin" "$acrm" "$acrh")"
  print -r -- "== ${label}"
  print -r -- "   origin: ${origin}"
  print -r -- "   deployed  status=$(print -r -- "$d" | cut -d'|' -f1)  allow-origin=$(print -r -- "$d" | cut -d'|' -f2)  allow-headers=$(print -r -- "$d" | cut -d'|' -f3)  allow-credentials=$(print -r -- "$d" | cut -d'|' -f4)"
  print -r -- "   local     status=$(print -r -- "$l" | cut -d'|' -f1)  allow-origin=$(print -r -- "$l" | cut -d'|' -f2)  allow-headers=$(print -r -- "$l" | cut -d'|' -f3)  allow-credentials=$(print -r -- "$l" | cut -d'|' -f4)"
  print -r -- ""
}

print -r -- "probe run: $(date -u '+%Y-%m-%dT%H:%M:%SZ')  deployed=${DEPLOYED}  local=${LOCAL} (ASPNETCORE_ENVIRONMENT=Development)"
print -r -- ""

row "A  preflight for a bearer PUT on an [Authorize] route" OPTIONS "/api/Store" "https://evil.example" "PUT" "authorization,content-type"
row "B  same preflight from an enumerated origin"           OPTIONS "/api/Store" "https://okam.no"      "PUT" "authorization,content-type"
row "C  preflight naming the Edda integration key"          OPTIONS "/Stores/52/orders" "https://evil.example" "GET" "x-okam-apikey"
row "D  preflight naming the external menu key"             OPTIONS "/api/external/menu/52" "https://evil.example" "GET" "x-api-key"
row "E  actual 401 on the external menu route"              GET "/api/external/menu/52" "https://evil.example" "" ""
row "F  actual 401 on the Edda orders route"                GET "/Stores/52/orders" "https://evil.example" "" ""
row "G  actual 401 on an [Authorize] route"                 GET "/User" "https://evil.example" "" ""
row "H  public 200"                                         GET "/health" "https://evil.example" "" ""
row "I  public 200 from the Swiss origin"                   GET "/health" "https://www.okam-swiss.ch" "" ""
row "J  public 200 from a loopback origin"                  GET "/health" "http://localhost:3000" "" ""
