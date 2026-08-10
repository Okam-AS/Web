```
RETURN: L-CRYPTO-PIN-BYFORM
brief: bc78780b
verdict: built
evidence: OkamAPI worktree /Users/svendaneel/okam/wt-cryptopin, branch lane/crypto-pin-byform @ cfb3b14a (code 35630600, off 6771ba9a, local, unpushed) - lanes/L-CRYPTO-PIN-BYFORM/evidence.md - artifacts/tests/lane-crypto-pin-byform-fast-tier.trx 4418/4406/0/12 - artifacts/tests/base-6771ba9a-fast-tier.trx 4415/4402/1/12
log:
BASE 6771ba9a (lane/confirm-conat-retire), the family tip - not c96cd21e, not 8704ff63. It descends from both and touches neither the generator nor its tests, so the subject is byte-identical at all three; UserService, which this lane also pins, HAD moved on between them.
FINDING VERIFIED FIRST and exact, neither over- nor understated: Random.Shared.Next inside Generate() left the source pin green (3/3) and the whole confirmation neighbourhood green (32/32).
BUILT four pins read off the COMPILED code. WHICH code mints is DERIVED - every method in the assembly assigning EmailConfirmationCode, async state machines included; an ldnull write is a retirement, every other write must reach the named generator.
WHAT the generator may touch is DEFAULT-DENY - the cryptographic source recognised by type assignability with no list, everything else must be a type that computes from its arguments. Unrecognised reds instead of unnamed passing.
Call sites guarded separately, so keeping the crypto call and overwriting what it returned is not a way through. The excusal catalog may not hold a Random, the crypto source, or a production type.
ONE remembered fact - the column name, through nameof - so a rename is a compile error, not a walk that quietly covers nothing.
ELEVEN MUTATIONS, one at a time, each restored and re-verified: shared instance, literal ctor, qualified+seeded, target-typed field, Random subclass, Guid, clock, hand-rolled LCG with no external member at all, indirection via our own helper, call-site overwrite, mint in a brand-new class. ALL ELEVEN RED.
The retired string pin reds against exactly ONE of those eleven. A DIFFERENT cryptographic form - Create() + GetBytes + BitConverter + rejection sampling, sharing no call with the one in the tree - passes 7/7.
Guards on the guards: excusing Random in the catalog reds the catalog AND still reds the source pin, because the positive half stops finding a RandomNumberGenerator member; blinding the remembered fact reds the corpus.
Statistical sibling kept and re-documented in the file: it proves not-degenerate and not-clock-reseeded, and proves nothing about predictability, which is a property of the source.
BASE MEASURED, not inherited: 4415/4402/1/12 from a clean checkout. Lane 4418/4406/0/12, exit 0. The +3 is four new pins minus the one retired.
FOUND, not mine and not fixed: the base's single failure is EventsOutboxDeliveryTests asserting DoesNotContain("250") against a body carrying a random PublicToken - the drawn token was fe4ff250-... Green on three re-runs. A ~1-in-125 aliasing flake, receipt kept honest rather than re-rolled.
The IL reader is extracted; GrowthProviderSeamScanTests had its own copy and now shares it.
No migration, no schema, no route. Five SQL containers up throughout, none started, stopped or touched; tier filter is the trait Database!=SqlServer. C7: no log call added, no test renders a drawn code, no code in either receipt.
C5 NOT met. Nobody has walked anything, and a green suite is never acceptance.
END RETURN
```
