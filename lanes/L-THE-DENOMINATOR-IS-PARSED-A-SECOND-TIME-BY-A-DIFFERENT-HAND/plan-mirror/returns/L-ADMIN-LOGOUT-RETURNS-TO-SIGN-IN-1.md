```
RETURN: L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN
brief: abfc0891
verdict: built
evidence: /Users/svendaneel/okam/Web/.claude/worktrees/agent-a2127f65723afed15/lanes/L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN/evidence.md
log:
DISCLOSURE FIRST: my `pkill -f nuxt-ts` between arms killed the owner's :3971 too. Restarted it from Web-modules with the same env inside ~4 min, recompiled clean, /admin=200. API/SQL/redis untouched.
LOGOUT ANSWERED: the reload carried NO teardown. ClearState empties currentUser/carts/orders and global-mixin's store subscriber persists that on the same tick; every service is rebuilt per access off the live token.
And all six admin pages with a setInterval on this path clear their timers in beforeDestroy, which a route change runs. A soft route change leaves nothing behind that the reload was removing.
FIX IS IN THE SHELL, NOT THE BUTTON: AdminPage watches userIsLoggedIn; a session that existed and ends shows the sign-in and replaces to /admin. Header and footer now only clear the session.
That covers the 401-driven ClearState in AdminUserService.Reload as well as the button, and the footer's copy of the identical window.location.href='/' — unreachable today, but a second copy is how this returns.
BARE /admin, deliberately: ?redirect= is the form closeLoginModal answers with $router.replace and never emits login-success (F-IN-PAGE-SIGN-IN-IS-DEAD-END-TO-END). /admin also mounts no LoginModal of its own.
BROWSER, port 3917, fresh compiler per arm, ONE typed URL each. stock: lands on /, no sign-in offered, SPA destroyed, no way back. fixed: lands on the admin sign-in, SPA alive, signs back in by clicking only.
BLANK PAGE DID NOT REPRODUCE: on this world the storefront renders its full marketing page (arm-stock/2-after-signout.png). The destination defect reproduced exactly; the hydration death is a separate measurement.
Store admin +4799681931 of store 1; the committed demo pair 99999999 has an EMPTY adminIn in OkamLiveTwoHumans and is bounced to /registrer, so it cannot walk this journey. No token or code printed anywhere.
TWO CONSOLE ERRORS PROVEN PRE-EXISTING: the ?storeId= re-append and the 401 on special opening days. AdminPageHeader mounts for anonymous visitors (only its ROOT is v-if'd) and its mounted() re-appends the query.
Traced by patching $router.replace in the live page; and the stock arm's control leg types /admin signed-out on the UNFIXED build and gets the identical URL and identical errors. Neither adds a redirect query.
test/admin-logout-destination.test.js: 6 of 7 RED on the unfixed three files, 7 green with them. The one green-on-both is the negative control — an anonymous visitor must not trigger the watcher.
Full jest 2594/2596, 114 suites. The 2 reds are journey-artifact-store asserting /^Web-modules@/ on the CHECKOUT DIRECTORY NAME; mine is a worktree. Same pair a sibling reported, zero refs to this diff.
NAMED NOT TAKEN: initAuth reads adminIn after an await, so a session ending in that window navigates to /registrer; and the storefront still links nowhere to /admin for anyone who reaches / another way.
Base lane/focustrap-teardown @ 8ac6f63 in a private worktree. Nothing committed, nothing pushed, no container. This RETURN is the only file written under Web-modules.
END RETURN
```
