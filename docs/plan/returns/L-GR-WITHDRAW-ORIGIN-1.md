```
RETURN: L-GR-WITHDRAW-ORIGIN
brief: 78fa37f3
verdict: fail-spec
evidence: lanes/L-GR-WITHDRAW-ORIGIN/RUNS.md (+ cross-site.png, same-site.png)
spec_gap: "a browser at the deployed preference-centre URL shows the session cookie attached on the preferences read, answering 200" — https://okam.no/preferences/communications answers 404. The Growth guest surface is unshipped: it exists only on feature/restaurant-modules and .github/workflows/nuxtjs.yml deploys main only. Closing it also needs a redeploy of the API's CORS policy, which is the reserved topology decision.
log: |
  Brief VERIFIED, neither break fixed. Cookie SameSite=Strict GrowthPreferenceController.cs:58-65;
  AllowAnyOrigin Program.cs:96-103 applied globally :285; API_BASE_URL nuxt.config.js:45.
  Break 2 confirmed LIVE: preflight to api.okam.no returns "access-control-allow-origin: *" and no
  allow-credentials. Break 1 confirmed in a real browser, not inferred.
  THIRD TOPOLOGY FOUND, better than the two named: api.okam.no is ALREADY a CNAME to the same App
  Service (both -> 40.118.102.46, /health 200, cert valid). okam.no + api.okam.no share registrable
  domain = SAME SITE, so Strict IS attached. Recommend C: API_BASE_URL -> api.okam.no + name origins.
  Reverse-proxy option is UNAVAILABLE: web is a static Nuxt export on GitHub Pages, cannot proxy.
  Browser harness on two genuinely different sites (localhost:3907 vs 127.0.0.1:4907), same-site
  control on 127.0.0.1:3907. It DISCRIMINATES: identical rows FAIL cross-site, PASS same-site.
  CORS fix is UNCONDITIONAL — AllowAnyOrigin blocks the credentialed preflight even same-site.
  SHARPER TRAP THAN BRIEFED: "off Strict" as SameSite=Lax IS STILL 401 cross-site. Lax rides only
  top-level navigations, never fetch. Only None;Secure crosses. C keeps Strict; B must drop it.
  EVENTS: cookie half does NOT bind it (guest client sends no credentials); CORS half DOES, and under
  C EventsSettings.PublicBaseUrl must be a subdomain of okam.no or it re-opens this later.
  No source changed, no topology picked silently. One-click unsubscribe untouched. Tree clean.
END RETURN
```
