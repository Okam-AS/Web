```
RETURN: L-LIVE-WALK-GROWTH
brief: 3c00bf8d
verdict: blocked
evidence: lanes/L-LIVE-WALK-GROWTH/live-walk-blockers.md
needs: +F-GROWTH-NO-LIVE-CONFIRM-LINK
log:
NO RUN CLAIMED. No container, no process, NO PORT BOUND - 4010/4971/4973 untouched, all foreign. Read-only at web 8ac6f63 / api 8e2b57de (clean). Nothing outside my lane dir, and no mail sent.
THE WIRE: the confirm link lives only inside a sent message. GrowthSubscriptionService.cs:89-92 mints it, :136 mails it, only ConfirmTokenHash is stored - the entity says "never the token".
So mailbox() (/__fixture/growth-links) has NO live analogue and none can be built. Nor a safe transport: Fake is in-memory on no route, Postmark sandbox never delivers, Smtp is the production relay.
WITHDRAWAL IS FURTHER OUT: MintUnsubscribeTokenAsync has ONE caller, DispatchService.cs:465, in the send loop - and that send prints the 404 preference link (GrowthSettings.cs:53, :688).
LIVE-ONLY DEFECT: growth.* ANDs under Growth:Enabled (false) yet Growth registers NO IStoreFeatureFlagEffectiveResolver, which Workforce and Margin do. Board reads ON, /subscribe stays dark.
THE FIXTURE LIE, on "the server's sentence, character for character": world.js:669-675 vs GrowthConsentTextSeed.cs:86-88 - id string vs long, version 3 vs 1, no shared wording (bedriften/virksomhet).
NOT gaps, checked: the consent register self-seeds at boot (Program.cs:387) and all 7 guest routes are real. Both specs are still @fixture. sql cap 2 is full and every live-walk lane is class node.
NEEDS: a mail sink or a product read path (blocks every walker); Growth__Enabled in live-world.sh step 4 (L-LIVE-SEED-VIA-PRODUCT owns it); a sql slot; a ruling on where "a guest subscribes" ends.
END RETURN
```
