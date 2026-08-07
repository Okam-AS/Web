# Mutation receipt — L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED

Produced by `lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED/mutate.py`. The change spans TWO
repositories — `core/` is a git submodule — so the mutations target files in both and the
driver restores both. A mutation whose search string is not found aborts the run: a no-op
mutation is indistinguishable from a test that cannot fail.

- arms in this lane's scope: **37** (27 in the service test file + 10 in the page file)
- arms red under at least one applied-and-restored mutation: **37**
- arms no mutation could break: **0**
- mutations applied: **18**
- mutations that killed nothing: **0**
- arms belonging to L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED disturbed by these mutations: **0**

The last number is the one that says the change is well-targeted: 36 arms from the prior lane
ran under all 18 mutations and none of them moved. The prior lane's arms carry their own
receipt and are deliberately NOT counted in this lane's denominator — counting them would let
these mutations look weak against arms they were never meant to touch.

## Every in-scope arm, and the mutations that killed it

### Get carries the status, so a caller can tell 401 from 403 from 500
- core: Get throws its own sentence again
- core: BuildError stops attaching the status

### Get falls back to its own sentence only when the body carried no reason
- core: Get throws its own sentence again
- core: BuildError stops attaching the status

### Get leaves the status undefined when the request never reached the server
- core: Get throws its own sentence again

### Get still resolves a good response
- core: a 200 stops being treated as success

### Get surfaces the backend reason instead of a sentence of its own
- core: Get throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from

### GetHeatmapData carries the status, so a caller can tell 401 from 403 from 500
- core: GetHeatmapData throws its own sentence again
- core: BuildError stops attaching the status

### GetHeatmapData falls back to its own sentence only when the body carried no reason
- core: GetHeatmapData throws its own sentence again
- core: BuildError stops attaching the status

### GetHeatmapData leaves the status undefined when the request never reached the server
- core: GetHeatmapData throws its own sentence again

### GetHeatmapData still resolves a good response
- core: a 200 stops being treated as success

### GetHeatmapData surfaces the backend reason instead of a sentence of its own
- core: GetHeatmapData throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from

### GetPendingSettlements carries the status, so a caller can tell 401 from 403 from 500
- core: GetPendingSettlements throws its own sentence again
- core: BuildError stops attaching the status

### GetPendingSettlements falls back to its own sentence only when the body carried no reason
- core: GetPendingSettlements throws its own sentence again
- core: BuildError stops attaching the status

### GetPendingSettlements leaves the status undefined when the request never reached the server
- core: GetPendingSettlements throws its own sentence again

### GetPendingSettlements still resolves a good response
- core: a 200 stops being treated as success

### GetPendingSettlements surfaces the backend reason instead of a sentence of its own
- core: GetPendingSettlements throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from

### GetPlatformGrowth carries the status, so a caller can tell 401 from 403 from 500
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status

### GetPlatformGrowth falls back to its own sentence only when the body carried no reason
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status

### GetPlatformGrowth leaves the status undefined when the request never reached the server
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again

### GetPlatformGrowth still resolves a good response
- core: a 200 stops being treated as success

### GetPlatformGrowth surfaces the backend reason instead of a sentence of its own
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from

### GetWoltDriveInvoice carries the status, so a caller can tell 401 from 403 from 500
- core: GetWoltDriveInvoice throws its own sentence again
- core: BuildError stops attaching the status

### GetWoltDriveInvoice falls back to its own sentence only when the body carried no reason
- core: GetWoltDriveInvoice throws its own sentence again
- core: BuildError stops attaching the status

### GetWoltDriveInvoice leaves the status undefined when the request never reached the server
- core: GetWoltDriveInvoice throws its own sentence again

### GetWoltDriveInvoice still resolves a good response
- core: a 200 stops being treated as success

### GetWoltDriveInvoice surfaces the backend reason instead of a sentence of its own
- core: GetWoltDriveInvoice throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from

### a crashed report engine reaches the operator as the reason the backend gave
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from
- page: a backend reason is no longer preferred

### a crashed report engine with an empty body names the code it answered with
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status
- page: the raw error message is printed again
- page: a server error loses its own sentence

### a failed read is said out loud instead of leaving an empty page
- page: an unrecognised throw is dressed up as a transport failure

### a failure that carries no message at all still says something
- page: an unrecognised throw is dressed up as a transport failure

### a non-2xx reaches the service instead of escaping it as an axios error
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status

### a refusal reaches the operator as the reason the backend gave
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops preferring the backend's reason

### a refusal with an empty body is still named, not reduced to a code
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status
- page: the raw error message is printed again
- page: a refusal loses its own sentence
- page: 401 and 403 are collapsed into one sentence

### an expired session reaches the operator as the reason the backend gave
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops preferring the backend's reason
- core: BuildError stops recording where the message came from
- page: a backend reason is no longer preferred

### an expired session with an empty body is still named, not reduced to a code
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status
- page: the raw error message is printed again
- page: an expired session loses its own sentence

### being offline is told apart from the server refusing
- core: the platform-growth read goes back to the unsafe GetRequest
- core: GetPlatformGrowth throws its own sentence again
- page: the raw error message is printed again
- page: being offline loses its own sentence

### the fallback sentence on that read had never run before, and runs now
- core: the platform-growth read goes back to the unsafe GetRequest

### the four failures do not read alike
- core: GetPlatformGrowth throws its own sentence again
- core: BuildError stops attaching the status
- page: the raw error message is printed again
- page: 401 and 403 are collapsed into one sentence

