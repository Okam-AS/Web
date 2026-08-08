RETURN: L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN
brief: f7034d29
verdict: built
evidence: docs/plan/lanes/L-EVERY-MODULE-CAN-BE-TURNED-ON-FROM-A-SCREEN/evidence.md
log:
All six modules walked in the owner's live world: switch clicked on /admin/feature-flags, then that module's own surface read. Six dark-to-lit pairs, every status captured off the network.
Workforce workforce.module: /workforce/stores/1/context 403 then 200, roster lists 4 named staff. Margin Margin.Module: /margin/status 404 then 200, 19 raavarer and a live recipe form.
Events Events.Core: /events/admin/1/events 404 then 200. Meals meals.module: /v1/stores/1/meals/companies 404 then 200. Growth growth.module: consent-text 404 then 200 on public /subscribe/1.
Training reads stay 200 by design (its gate refuses writes only); what answers the flip is its own Modulstatus panel off /training/stores/1/context, Kurs og sertifikater Av to Paa.
CORRECTION to the gap reading: Margin HAS an operator lever. MarginModuleGate.Resolve reads the store row FIRST (MarginModuleGate.cs:33-42), proven live with Margin:EnabledStoreIds empty.
CORRECTION: the meals.module row also overrides the Features:Meals:Module config gate (StoreBackedMealsFeatureFlags.cs:36-43). Only the three Meals money sub-flags are host-only.
TRAP INVERTED for Growth: growth.module gates the PUBLIC capture, not the admin newsletter screen (reads/authoring ungated on purpose). Flipping it against /admin/growth-newsletter changes nothing.
The unreachable switch that blocks a venue today: Events:DispatchEnabled, host-only, false here. Pipeline reads "Utsending er slaatt av ... Venter: 10" and no screen releases those ten guest links.
Host-only and should stay so: Growth:Enabled is the crypto-provisioning fail-fast gate; a store row opening it would route live guest addresses over the dev fallback root (StoreBackedGrowth:46-52).
Host-only with no such reason: Events:Enabled; Features:Meals Ordering/Projection/Statements (no catalog entry, so no row); Growth:MailProvider ships Fake.
Board honesty measured: with Margin.Module down, both Margin stage rows read Faktisk av plus the overruled warning while their own rows stay on. That is the resolver reporting the gate, not the row.
Not falsifiable here: Events/Growth/Meals fall through StoreFeatureFlagsController.cs:65 and echo the row, but both host switches are ON via launch env, so the echo agrees. Falsifying needs a restart.
Live API is /Users/svendaneel/okam/wt-lwtwo-api at 118f92fb9, launched with Features__Meals__*, Events__Enabled, Growth__Enabled true. The three prior-lane resolvers are not in this binary.
DEFECT: Workforce alone misnames its refusal. Module-off answers 403 and workforce-roster.vue:275 prints "Du har ikke bemanningstilgang", blaming the person. Every other module names the module.
World restored as found, 19/19 rows on. No server started or restarted, no container touched, no curl flag write, no worktree, no commit on the owner's branch; artifacts untracked like every sibling.
END RETURN
