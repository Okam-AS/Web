```
RETURN: L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER
brief: f7635cb7
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-EVIDENCE-RECORD-CAN-BE-HANDED-OVER/evidence.md
log:
Built the print path, not an export: a browser-built CSV is a SECOND rendering of append-only evidence, which this component's header and the personalliste forbid; a signed file needs an API restart.
The page's sentence was NOT touched and still names no statute. C6's letter was never breached; its spirit was, and the fix was to build the document rather than withdraw the promise.
lane/evidence-record-handed-over @ ab6e7e1 off trunk 780d405, unpushed: control disabled until a record answers, paper-only heading, print rules, 3 keys in no/en/de, 11 jsdom arms, 4 e2e steps.
Every rule SCOPED — no body class, no head(). The estate already shipped a print stylesheet whose guard vue-meta rebuilt away, leaving the rules in the file and the shell on the paper.
PROVEN IN THE OWNER'S LIVE WORLD (:3971/:5971, 99681931): signed in via the modal, opened Selma Haug's record (1 completion, 2 certificates, 18 ledger rows), pressed the button, got a 2-page A4 PDF.
READING THE PDF CAUGHT TWO DEFECTS EVERY DOM ASSERTION HAD PASSED. A named @page box claimed part-way through the flow put out a BLANK FIRST SHEET.
And it was laid out at one width and cropped at another: "Opphav" printed "Opp", a ledger delta stopped mid-JSON — a sheet that LOOKS complete, missing the column naming who filed each row.
Fixed by dropping the named @page and making the tables table-layout:fixed with declared widths. The broken file is kept beside the good one as BEFORE-clipped-and-blank-first-page.pdf.
A third would have been worse: .trn-ev__scroll is overflow-x:auto and a printer cannot scroll, so without overflow:visible the columns lost were the actor and the delta.
The details material is forced open on paper. A hash printed without the pages it was taken over is a figure an inspector can only believe.
Tier 154 suites / 3605 tests / 0 failed (trunk 153/3594). Mutations: collapsing canPrint reds 5 arms, unbinding the click reds 1. pdftotext finds the record on the file and none of the controls.
LEFT APPLIED IN THE OWNER'S WORLD so Sven can walk it: web-livewalk carries this exact diff over 5 files via HMR, no restart. Undo: git -C ~/okam/web-livewalk checkout -- pages components translations
Worktree /Users/svendaneel/okam/web-trnprint created and REMOVED; branch survives. No container touched, no server restarted, nothing pushed.
RESIDUE: a server-rendered signed export is still stronger and is a backend lane — this carries no content hash of its own. The onboarding banner still prints for a store in onboarding.
The 4 e2e steps were written but NOT RUN: that config starts its own nuxt and fixture backend. Every assertion in them ran first against the live world via walk.js, kept in the lane directory.
END RETURN
```
