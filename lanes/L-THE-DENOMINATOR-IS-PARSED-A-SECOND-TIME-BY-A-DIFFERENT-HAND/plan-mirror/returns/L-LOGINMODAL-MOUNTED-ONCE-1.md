```
RETURN: L-LOGINMODAL-MOUNTED-ONCE
brief: 2682f1bb
verdict: built
evidence: /Users/svendaneel/okam/web-loginmodalonce/lanes/L-LOGINMODAL-MOUNTED-ONCE/kill-proof-browser.txt
log:
Census verified independently: ELEVEN admin pages, not twelve. brev dinehome kitchen lang onboarding ongoing orders payouts statistics wolt-calc wolt-menu, each at 2 mount sites, now 1.
Three counts existed in-repo (ten / twelve / eleven). The estate-scroll-lock note says ten, the sibling lane's spec says twelve. Compiled every template and walked every closure: eleven.
/admin mounts none of its own and never did — the "second on /admin in fixture mode" did NOT reproduce; the browser reports 1 there before and after. workforce-me.vue also carries no modal of its own.
Duplicates deleted, not disambiguated. The reload each one did after sign-in moves to AdminPage's existing @login-success, the pattern 47 admin pages already use.
BEHAVIOUR THAT WOULD HAVE BEEN LOST: onboarding + wolt-menu also raised a modal when _userService.Reload() answered false. AdminPage.initAuth calls Reload and IGNORES its result (AdminPage.vue:103).
So AdminPage gained openLogin(); both pages call $refs.adminPage.openLogin(). Mutation 19 deletes it and the suite reds, so it is load-bearing rather than decorative.
Red proved first: red-proof.txt lists all eleven at 2 before any edit. Then 20 mutations, 0 fooled — incl. kebab-case, a nested component, a v-else branch, and 2 inverses that must STAY green.
Browser arm is the real answer to the brief's claim: with lang.vue restored to HEAD, /admin/lang serves .login-modal=2 AND 2 phone fields. Arms either side report 1 of each on all six routes.
A HARNESS THAT LIED, caught: the first browser arm mutated under one running dev server + a 25s sleep and PASSED on a page with two mount sites. It now restarts the compiler per arm.
Suite 112/112, 2548/2548. Four excluded suites shown to fail without my change too: worktree-name hazard, core/ submodule empty (2 pass once borrowed), core-request-path-shape red at HEAD.
ESLint measured per file against its own HEAD content: no file gains an error or a warning; wolt-menu improves 8/127 to 7/125.
FOUND: brev.vue called this.loadOrders() on sign-in and has no such method (TypeError). Fixed incidentally — @login-success now points at loadLetters.
FOUND: wolt-menu.vue bound @login-success to a handleLoginSuccess that did not exist. It exists now and re-runs the mount-time user reload.
FOUND: components/atoms/MyUserDropdown.vue mounts a LoginModal and nothing renders it. Dead code carrying a duplicate; left in place, pinned in test 3's census.
NO COLLISION with L-LOGINMODAL-SUCCESS-IS-SILENT: not one line of components/molecules/LoginModal.vue is in this diff. Work is on lane/loginmodal-mounted-once at 0f88242, unpushed.
END RETURN
```
