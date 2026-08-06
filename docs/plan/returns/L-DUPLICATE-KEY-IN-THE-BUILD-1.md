```
RETURN: L-DUPLICATE-KEY-IN-THE-BUILD
brief: 8fed0d4e
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-DUPLICATE-KEY-IN-THE-BUILD/finding.md
log:
SILENT. Planted a second categories_create, ran the command that SHIPS - npm run generate, not nuxt build: exit 0, 212 routes, warning set byte-identical to the pristine baseline.
Asked twice, since vercel.json ships OKAM_EDITION=ch: default edition (locales en,no) planted into no.ts, and ch (locale de) planted into de.ts. Both exit 0, both silent.
WHY: typescript.typeCheck=false, so ts-loader is transpile-only and fork-ts-checker never constructed; no eslint in buildModules. Measured: transpileModule [] vs getSemanticDiagnostics [1117].
More than tolerated: @babel/plugin-transform-duplicate-keys emits _defineProperty(obj,"categories_create",LATER). Last-wins is preserved ON PURPOSE - the old belief is exactly true here.
LOCALES: all three dictionaries compile in BOTH editions (translations/index.js imports them statically). The Swiss build renders 0 Norwegian routes yet ships no.ts whole.
FREE LEVER both ways: typeCheck:true reds the same plant (exit 1, ONE diagnostic, TS1117 at translations/no.ts:5513:3), exit 0 / 0 errors pristine, 35.9s vs 36.1s. NOT applied - plan's call.
INSTRUMENT: symlinked node_modules made webpack compile the SHARED checkout's components - caught only because one differed. Fixed with cp -Rc; it clobbered shared node_modules/.cache/nuxt.
4817/4782/4782 is HEAD 8ac6f63, NOT the working tree (5164/5129/5129 dirty); I built candidate 9f7d8df = 5090/5055/5055. Restored byte-for-byte, trees clean, shared dicts never written.
Cut at 08:20 mid-deliverable; nothing reconstructed - all re-measured after the fault (RERUN-A/B/C). Node v24, not CI's 16. Commit b4300b4, no push. A FocusTrap/Vue-3 message was another lane's.
END RETURN
```
