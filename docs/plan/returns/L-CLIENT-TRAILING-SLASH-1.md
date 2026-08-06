```
RETURN: L-CLIENT-TRAILING-SLASH
brief: 66677564
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-CLIENT-TRAILING-SLASH/mutation-receipt.md
log:
verified first: UserController declares confirm-email BARE, the client posted it slashed. Real.
brief wrong on scale: 418 call sites parsed, THIRTEEN end in a slash, FIVE in user-service.ts, so
"unlike every other route in that file" was false. All 13 fixed, all 13 declared bare in OkamAPI.
built: test/core-request-path-shape.test.js - no allowlist. It derives the path-taking methods from
RequestService's own signatures, walks the corpus, and asserts one leading slash, no doubled slash,
no trailing slash. One remembered fact in the whole file.
exit proof: 8 mutations, every one reds on the named test - defect put back, new slashed route,
doubled slash, missing leading slash, renamed path parameter, broken arg scanner, walk that stops
reaching core/, confirm call deleted. All 8 tests falsified; none can pass vacuously.
wire proof: fixture TEMPORARILY pinned to the bare path, A/B/A on one warm server on 3037/4037 -
bare PASS, slashed FAIL (code panel never appears), bare PASS. Pin reversed by exact replace.
consumer fixture made slash-insensitive: ../ConsumerWeb has its OWN core, still posts slashed.
NOT built: the fixture-implements-every-client-route cross-check - feasible from this same corpus, noted in the guard header, left to the wider-problem lane.
538abe6 on arrival, dd55b11+3ee9c15 landed mid-lane; committed 033d180 + core 1bcab0b; jest 104/2370/0; started and stopped only my own servers, 3952 untouched.
END RETURN
```
