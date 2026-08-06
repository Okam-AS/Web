RETURN: L-EV-ONBOARD-PRINT-BLEED
brief: 0d1b2a9e
verdict: built
evidence: lanes/L-EV-ONBOARD-PRINT-BLEED/evidence.md
log:
Brief verified on the PDF first: the unfixed sheet's FIRST printed line was the nag
("…oppsett-prosess … Fortsett oppsett  Lukk"), then "Kjøreplan" — real on paper,
not a viewport artifact like the 264px gutter.
The premise dissolved. The page cannot reach the banner, but the banner can hide
ITSELF: a scoped @media print in OnboardingNotification.vue, its own attribute on
its own root — what .admin-nav has always done. So no body class, no vue-meta
bodyAttrs, no unscoped rule; layouts/default.vue untouched, okam-ch never at risk,
and the estate-wide body-class question stays open without blocking this.
Absence assertion has 3 positive controls (banner on screen, sheet on screen, sheet IN THE PDF); pdftotext hard-required here, not optional as in the sibling.
A pt-threshold geometry assertion was written, measured and deleted: topmost text is
56.0pt both before and after, so no threshold could discriminate. Now: which line is first.
Reds 3 ways: unfixed tree, @media speech, and an inverted spec asserting the banner
IS on paper (fails only after the fix — so the PDF assertions discriminate, not just the DOM).
Green: playwright 6/6 incl. sibling; jest 98/2257; core/ intact; no shared fixture touched.
Flag: workforce-personnel-list.vue:358 now a redundant copy on the inert body-class path.
END RETURN
