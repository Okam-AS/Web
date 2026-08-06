```
RETURN: L-GROWTH-PREFCENTRE
brief: c50af366
verdict: blocked
evidence: lanes/L-GROWTH-PREFCENTRE/deploy-state-2026-08-05.md
needs: +L-PREFCENTRE-DEPLOY-EXEC
reason: D-PREFCENTRE-DEPLOY is ruled but not executed; every remaining step is a shared-branch push or production action my boundaries forbid. No agent action puts a browser at a deployed origin.
log:
MEASURED not inherited: main e7896bc = 0 preference pages; backend integ 8e2b57de = 0 EnableCors; lane 2a052800 NOT an ancestor of it; .github/workflows identical main vs HEAD. All checks read-only.
LIVE: /preferences/communications 404 (SPA fallback shell); /subscribe/confirm 404; /admin/ 200; api.okam.no preflight = allow-origin:* no allow-credentials; api.okam-swiss.ch NXDOMAIN.
PER C5 I DO NOT OFFER THE LOCAL CAPTURE as the exit. It runs page+API on 127.0.0.1, same-site by construction, so it cannot discriminate the SameSite half. No person has completed this journey.
FINDING: no pipeline change is needed for the consumer half - static route, token in the URL FRAGMENT, so MERGING TO MAIN ALONE FIXES IT (/admin/ 200 proves it). The hard half is the API deploy.
DEFECT: both facts gating F-PREF-UNREACHABLE are mis-probed - a perfect deploy still leaves it open. growth.prefcentre.cors reads Program.cs; AllowCredentials is at ServiceCollectionExtensions.cs:86.
growth.cookie.crosssite demands SameSiteMode.None - the half D-PREF-ORIGIN's own correction says to RETIRE; the lane is deliberately Strict at GrowthPreferenceController.cs:76. Sven's call, not mine.
C6 HAZARD: GrowthSettings.cs:53 defaults the link to the URL that 404s, DispatchService.cs:688 prints it in every send - NO REAL GROWTH MAIL MAY LEAVE until main lands. Held only by config today.
END RETURN
```
