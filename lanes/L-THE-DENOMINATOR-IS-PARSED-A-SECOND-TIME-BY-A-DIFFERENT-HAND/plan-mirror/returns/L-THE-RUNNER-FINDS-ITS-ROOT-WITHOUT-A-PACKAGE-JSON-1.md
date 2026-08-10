RETURN: L-THE-RUNNER-FINDS-ITS-ROOT-WITHOUT-A-PACKAGE-JSON
brief: 4af493fd
verdict: built
evidence: docs/plan/returns/L-THE-RUNNER-FINDS-ITS-ROOT-WITHOUT-A-PACKAGE-JSON-1.md
log:
lane/runner-finds-its-root @ 10ace1a, one commit off trunk 9d88101, worktree web-anchor DETACHED throughout. Trunk NOT moved — the exit asks for a green lane tip, not a landing. Not pushed.
WHAT I ANCHOR ON: the nearest ancestor holding a .git entry, accepting the FILE form as well as the directory — every worktree here is the file form, so a directory-only test would re-throw.
package.json is kept as a second marker checked AFTER .git, so a JS project that is not a repository still works. Both sit at the same level here, so ROOT is unchanged.
WHY IT CANNOT WALK OUT: the search only moves UP from the script, so every candidate is an ancestor of it by construction and can never be a computed path that fails to contain it.
.git is checked before package.json, so a repo root outranks any package.json outside it; and there is no default — the filesystem root throws rather than operating on a non-repository.
PROVED IN THE REAL BACKEND REPO, not just a fixture. Before: "Error: no package.json above .../tools". After: BASE 6 tests 0 red, then RED (1) on a real .NET mutation.
There is no package.json anywhere above the backend test projects, which is why the old anchor threw and why every backend mutation pass in this program was hand-rolled.
THE FIRST REAL .NET RUN FOUND A DEFECT IN THE DIALECT I ADDED. ASP.NET logs "Failed to determine the https port for redirect." and the vstest name pattern read it as a failed test name.
A clean baseline therefore reported 1 red. Counts were right so the verdict survived, but a phantom name present in one run and not another is how a false RED or a masked kill is made.
The pattern now requires vstest's own shape — one unbroken token then a bracketed duration. Both directions pinned: prose is not a name, a real failure line still is.
I WROTE A CONTAINMENT ASSERTION AND REMOVED IT, having measured it: the historical ../ count reds three arms WITH it and the same three WITHOUT. It guarded nothing the arms do not.
FOUR ARMS: runs in a git repo with NO package.json and judges a vstest suite there, asserting 12 tests baselined; refuses a tree that is neither repo nor package; plus the two name arms.
Mutation receipt with the runner itself: 5 mutations, 5 RED, 0 survivors, 0 that killed nothing. Reverting the .git anchor reds 1; the historical ../ count reds 3.
Nothing regressed: buffer restore with byte assertion, the DESTROYED arm, the three-root sweep with comment-stripping both ways, INVALID-RUN in either exit direction. Pin suite 23 to 27 arms.
Frontend tier at the lane tip: 183 suites, 4449 tests, 0 failures, no new suite file. Backend staging removed, its tracked tree clean and backend trunk c4326402c untouched.
END RETURN
