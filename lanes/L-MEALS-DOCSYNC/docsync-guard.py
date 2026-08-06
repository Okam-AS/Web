#!/usr/bin/env python3
"""L-MEALS-DOCSYNC guard — reds when a Meals document reasserts something the code has falsified.

DESIGN CONSTRAINT THAT SHAPED THIS. A guard keyed to one sentence is defeated by a rewording, and a
guard keyed to a hardcoded truth ("the binding exists") rots the moment the code moves the other way.
So every rule here has TWO halves resolved at RUN TIME:

  truth(): parses the source of record and answers "does this capability exist right now?"
  claim(): a FAMILY of regexes for prose asserting it does not.

A rule fires only when truth() says the thing exists AND a claim() match is found. If the code is
reverted, truth() goes false and the rule stops firing on its own — the guard cannot outlive its
subject. If truth() cannot be resolved at all (file missing, checkout on another branch) the rule
reports UNRESOLVED and the run fails, because a silent pass is the failure mode being guarded against.

Exit 0 = clean. Exit 1 = a reasserted false claim, or a truth that could not be resolved.
"""
import os
import re
import sys

# Roots are overridable so the guard can be pointed at the lane worktrees OR at the shared
# integration checkouts. Running it against BOTH is the point: the difference between the two IS
# what merging this lane buys, stated as a machine result rather than a claim.
BE = os.environ.get("DOCSYNC_BE", "/Users/svendaneel/okam/wt-mealsdocsync")
FE = os.environ.get("DOCSYNC_FE", "/Users/svendaneel/okam/Web-modules")
CW = os.environ.get("DOCSYNC_CW", "/Users/svendaneel/okam/ConsumerWeb")

# ---------------------------------------------------------------------------------------------
# the surface the rules police
# ---------------------------------------------------------------------------------------------
SURFACE = [
    (BE, ("Controllers/Meals", "Entities/Meals", "Helpers/Meals", "Models/Meals",
          "Services/Meals", "WebApi.Tests/Meals")),
    (BE, ("Scripts/demo",)),
    (FE, ("pages/meals", "components/admin/meals", "utils/meals")),
    (FE, ("test/e2e/journeys", "test/e2e/fixture")),
]
SURFACE_FILES = [
    (BE, "docs/plans/replan/b-meals-completeness.md"),
    (FE, "pages/admin/meals-companies.vue"),
    (FE, "pages/admin/meals-agreements.vue"),
]
TEXT_EXT = (".cs", ".md", ".sh", ".vue", ".js", ".ts", ".json")


def surface_files():
    seen = []
    for root, dirs in SURFACE:
        for d in dirs:
            base = os.path.join(root, d)
            for cur, _, files in os.walk(base):
                if any(p in cur for p in ("/obj/", "/bin/", "/node_modules/", "/.git/")):
                    continue
                for f in sorted(files):
                    if f.endswith(TEXT_EXT):
                        seen.append((root, os.path.join(cur, f)))
    for root, rel in SURFACE_FILES:
        p = os.path.join(root, rel)
        if os.path.exists(p):
            seen.append((root, p))
    out, taken = [], set()
    for root, p in seen:
        if p not in taken:
            taken.add(p)
            out.append((root, p))
    return out


def read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return None


def strip_comment_lines(text):
    """A call that is commented out is not a call. The binding lane's own mutation proof caught
    exactly this: Assert.Contains over raw source is satisfied by a commented-out registration."""
    keep = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("//") or s.startswith("///") or s.startswith("*") or s.startswith("#"):
            continue
        keep.append(line)
    return "\n".join(keep)


# ---------------------------------------------------------------------------------------------
# truths, resolved by parsing the source of record
# ---------------------------------------------------------------------------------------------
def truth_options_bound():
    prog = read(os.path.join(BE, "Program.cs"))
    ext = read(os.path.join(BE, "Helpers/Meals/MealsModuleServiceCollectionExtensions.cs"))
    if prog is None or ext is None:
        return None
    called = "AddMealsFeatureOptions()" in strip_comment_lines(prog)
    binds = re.search(r"BindConfiguration\s*\(", strip_comment_lines(ext)) is not None
    return called and binds


def truth_agreement_create_route():
    d = os.path.join(BE, "Controllers/Meals")
    if not os.path.isdir(d):
        return None
    for f in sorted(os.listdir(d)):
        t = read(os.path.join(d, f))
        if t and re.search(r'\[HttpPost\("[^"]*agreements"\)\]', strip_comment_lines(t)):
            return True
    return False


def truth_client_sends_reservation_token():
    """The backend half AND a real client half.

    HARNESS NOTE, diagnosed rather than papered over. This first named
    `ConsumerWeb/components/organisms/CheckoutMeals.vue` as the client half and returned False against
    a live, working checkout. That component is the payer STRIP — it chooses the tender and renders the
    reserved cap; it never names the token. The file that puts the token ON THE WIRE is the shared Core
    submodule's `core/services/cart-service.ts` (`Complete(storeId, reservationToken?)` ->
    `?reservationToken=`, Core `ef833ca`), which every client embeds. Pointing the truth at the strip
    made the guard answer "absent" for a capability that exists — the exact false negative this lane
    exists to remove, produced by the lane's own instrument.

    ConsumerWeb is a sibling checkout on another branch; if it is not on disk the rule is UNRESOLVED
    rather than quietly true or quietly false."""
    carts = read(os.path.join(BE, "Controllers/CartsController.cs"))
    if carts is None:
        return None
    backend = "reservationToken" in strip_comment_lines(carts)
    wire = read(os.path.join(CW, "core/services/cart-service.ts"))
    strip = read(os.path.join(CW, "components/organisms/CheckoutMeals.vue"))
    if wire is None or strip is None:
        return None
    client = re.search(r"reservationToken", strip_comment_lines(wire)) is not None
    return backend and client


def truth_a_client_claims_invitations():
    join = read(os.path.join(FE, "pages/meals/join.vue"))
    if join is None:
        return None
    return re.search(r"invitations?/claim|claimInvitation|claim\s*\(", strip_comment_lines(join)) is not None


# ---------------------------------------------------------------------------------------------
# rules
# ---------------------------------------------------------------------------------------------
RULES = [
    dict(
        id="OPTIONS-BOUND",
        truth=truth_options_bound,
        why="Program.cs calls AddMealsFeatureOptions() and the extension calls BindConfiguration "
            "(d81f037b); appsettings.json ships the section (bf650efd).",
        patterns=[
            # The trailing [`*\s]* is load-bearing. Markdown wraps the identifier in backticks, so
            # "`Configure<MealsFeatureSettings>` is never called" did NOT match a version of this
            # pattern that assumed the identifier abutted the verb -- the guard missed RUNBOOK.md's
            # section 0 and section 9 while catching the same claim in the .sh, which has no backticks.
            # Found by reconciling the guard's hits against the hand sweep, not by the guard itself.
            r"Configure<MealsFeatureSettings>[`*\s]*(?:is|was)?[`*\s]*never\s+called",
            # ONLY the negative forms. An earlier revision matched `(?:un)?bound`, which fired on
            # "`Features:Meals:Ordering` are bound from host config" -- a TRUE sentence in
            # meals-module-dark.spec.js. A guard that reds on the corrected text teaches the next
            # reader to delete the correction.
            r"Features:Meals[^.\n]{0,60}(?:is|are)\s+never\s+bound",
            r"Features:Meals[^.\n]{0,60}(?:is|are)\s+unbound",
            r"section\s+is\s+(?:therefore\s+)?never\s+bound",
            r"nothing\s+(?:reads|binds)\s+the\s+section",
            r"Features:Meals\s+UNBOUND",
            r"binding\s+it\s+is\s+item\s+2",
            r"unbound\s+config\s+section",
        ],
    ),
    dict(
        id="AGREEMENT-CREATE",
        truth=truth_agreement_create_route,
        why="MealsAgreementController exposes POST .../agreements (588061e7).",
        patterns=[
            r"agreements?\s+have\s+no\s+create\s+endpoint",
            r"no\s+agreement-create\s+endpoint",
            r"corridor\s+agreement\s+has\s+no\s+production\s+write\s+path(?![\s\S]{0,400}closed by)",
            r"no\s+(?:create\s+)?endpoint[^.\n]{0,40}\bagreements?\b[^.\n]{0,20}in\s+v1",
        ],
    ),
    dict(
        id="RESERVATION-TOKEN",
        truth=truth_client_sends_reservation_token,
        why="Core cart-service.ts puts ?reservationToken= on the wire (Core ef833ca); ConsumerWeb "
            "CheckoutMeals.vue offers the payer (ac264e5); CartsController.Complete receives it.",
        patterns=[
            r"reservation\s+token\s+no\s+cart",
            r"no\s+cart\s+in\s+this\s+estate\s+sends",
            r"reservation\s+token\s+nothing\s+in\s+the\s+estate\s+sends",
            r"company-account\s+payer\s+no\s+client\s+offers",
            r"no\s+client\s+can\s+complete\s+a\s+company-funded\s+checkout(?![\s\S]{0,400}closed by)",
        ],
    ),
    dict(
        id="INVITATION-CLAIM",
        truth=truth_a_client_claims_invitations,
        why="pages/meals/join.vue claims invitations (a3f6100).",
        patterns=[
            r"no\s+client\s+in\s+the\s+estate\s+claims\s+one",
            r"nobody\s+claims\s+an\s+invitation",
            r"no\s+client\s+claims\s+an\s+invitation",
        ],
    ),
]

# Prose that is EXPLICITLY historical is not a live claim. The rules police assertions in the
# present tense, and a document that says "it used to be X, closed by <commit>" is the correct
# shape this lane is trying to produce -- it must not be what the guard punishes.
HISTORY = re.compile(
    r"used to be|it did not before|was\s+item\s+2|now\s+CLOSED|is\s+now\s+closed|closed by|"
    r"no longer|is\s+bound\b|must not be written again|the premise that kept it unbound is dead|"
    r"NOT true any\s*\n?\s*\*?\s*more|is\s+dead\b|stops? saying|gap is now closed|was MIG-17",
    re.IGNORECASE)

# A DATED FREEZE-FRAME is not a live claim, and rewriting its rows to agree with today is the exact
# thing this lane is forbidden to do ("do not delete a finding to make text agree -- close it, dated").
# Such a document is exempt only when it BOTH declares itself a freeze-frame AND carries a dated
# closure naming a commit. Both halves are read out of the file at run time, so a document that drops
# its closure block stops being exempt.
FREEZE = re.compile(r"VALID AS OF|freeze-frame|deliberately left unedited", re.IGNORECASE)
CLOSURE = re.compile(r"closed by\s+`?[0-9a-f]{7,40}`?", re.IGNORECASE)


def is_closed_freeze_frame(text):
    return FREEZE.search(text) is not None and CLOSURE.search(text) is not None


def main():
    files = surface_files()
    problems = []
    unresolved = []

    print("=== TRUTHS RESOLVED AT RUN TIME ===")
    truths = {}
    for rule in RULES:
        v = rule["truth"]()
        truths[rule["id"]] = v
        state = {True: "EXISTS", False: "absent", None: "UNRESOLVED"}[v]
        print("  %-18s %-11s %s" % (rule["id"], state, rule["why"]))
        if v is None:
            unresolved.append(rule["id"])

    print()
    print("=== SURFACE SCANNED ===")
    print("  %d files under the Meals surface of both repos" % len(files))

    for rule in RULES:
        if truths[rule["id"]] is not True:
            continue
        rx = re.compile("|".join(rule["patterns"]), re.IGNORECASE)
        for root, path in files:
            text = read(path)
            if text is None:
                continue
            if is_closed_freeze_frame(text):
                continue
            for i, line in enumerate(text.splitlines(), 1):
                m = rx.search(line)
                if not m:
                    continue
                lo = max(0, i - 4)
                window = "\n".join(text.splitlines()[lo:i + 3])
                if HISTORY.search(window):
                    continue
                problems.append((rule["id"], os.path.relpath(path, root), i, line.strip()))

    print()
    if unresolved:
        print("=== UNRESOLVED TRUTHS (a rule that cannot see its subject must not pass silently) ===")
        for r in unresolved:
            print("  UNRESOLVED " + r)
    print("=== REASSERTED FALSE CLAIMS ===")
    if not problems:
        print("  none")
    for rid, rel, i, line in problems:
        print("  %-18s %s:%d: %s" % (rid, rel, i, line))

    print()
    verdict = "CLEAN" if not problems and not unresolved else "FAIL"
    print("=== %s ===" % verdict)
    return 0 if verdict == "CLEAN" else 1


if __name__ == "__main__":
    sys.exit(main())
