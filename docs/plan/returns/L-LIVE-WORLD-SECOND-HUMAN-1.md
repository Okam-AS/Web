RETURN: L-LIVE-WORLD-SECOND-HUMAN
brief: cd379fe4
verdict: built
evidence: OkamAPI-modules feature/restaurant-modules 8e2b57de -- Controllers/UserController.cs:178-180 + Helpers/ServiceCollectionExtensions.cs:182 + Services/UserService.cs:540,551,565
log:
The app has exactly TWO no-SMS doors. UserController.cs:178 demo, :179 power-user. live-world.sh spends the demo one.
Path 3 is NOT a bypass: UserService.cs:560-568 generates the one-time token, skips only the SEND, returns true. Lock-out.
It is also not on IUserService (Interfaces/IUserService.cs:31-34) and gets no exemption at :540, so the account cannot be created either.
Path 2 IS a real second door with the key held outside the repo. Subject = AppSettings:AdminUserPhoneNumber, placeholder at appsettings.json:13.
Unusable in place because ServiceCollectionExtensions.cs:182 limits user names to "+0123456789", so CreateAsync at UserService.cs:551 refuses the sentence.
Owner act = set AppSettings__AdminUserPhoneNumber to a digit phone at API launch. That is production's own lever (Azure), not a manufactured door.
Hard boundary behind all three: ONE CreateAsync call site in the non-test tree, and :540 sends every other phone through Twilio Lookup, which has placeholder creds.
Allocation is the judgement call: the power-user door grants PowerUserRole and StoreAdminAuthorizationHandler.cs:17 makes it a StoreAdmin everywhere.
Put it on the MANAGER, worker on the demo door. A PowerUser worker would silently gain the admin surface with nothing saying so.
Worker screen is unaffected either way: StoreService.cs:176 builds adminIn from membership only, so nav-access still resolves ACCESS_WORKER.
WALL 2 (engagement) closes with NO owner act: endpoint 6 returns the raw claim token once, endpoint 32 claims it, no capability and no module gate.
POST /staff sets WorkforcePersonState.Invited (WorkforceStaffService.cs:193) which MayBeClaimed accepts, and the seed already grants WorkforceSelf.
WALL 3, unnamed until now: ack #44 gates on workforce.selfservice (WorkforceSelfService.cs:326) and DefaultOn holds workforce.setup ALONE.
So the walk needs the manager to flip workforce.publication + workforce.selfservice on the flag board, and the published week must assign the claimed engagement.
NO CAPTURE: this lane has no SQL slot, so no live world was stood up. Also flagging AppSettings:PowerUserVerificationCode is committed live at appsettings.json:21.
END RETURN
