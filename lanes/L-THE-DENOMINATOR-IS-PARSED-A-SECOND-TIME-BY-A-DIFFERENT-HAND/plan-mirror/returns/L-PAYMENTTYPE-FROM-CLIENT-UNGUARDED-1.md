```
RETURN: L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED
brief: c4a14a8e
verdict: fail-spec
evidence: lanes/L-PAYMENTTYPE-FROM-CLIENT-UNGUARDED/finding.md
spec_gap: Brief says FinalizeService.cs:501/:637 take PaymentType off a client DTO; those DTOs are never model-bound and all 4 callers pass server constants (PosController:712/:779; tx.PaymentType).
log: Ref feature/restaurant-modules @ 8e2b57de (rev-parse + is-ancestor confirmed); working dir on lane/meals-grace-pins never read. Mechanism is real, stated reachability is not.
log: PRINT PROVEN NOT ARGUED (_proof/, verbatim tip code, run twice identical): 999 prints "999                       125,00" = 39 39 39, 23x 20, 31 32 35 2C 30 30, 0A. Same for 7, -1, 121, MaxValue.
log: VALIDATION, named before concluding none: no [Flags]; zero [Required]/[EnumDataType]/[Range] on any PaymentType property; Enum.IsDefined exists at 9 estate sites, none on PaymentType.
log: Binder is Newtonsoft+StringEnumConverter (ServiceCollectionExtensions:168-172), PROVED to accept 999, 7 and "999", rejecting only unknown names. The enum hazard itself is genuine.
log: THE GUARD THAT HOLDS: PosSettlementService:294/:351/:392 whitelists Cash/terminal/CompanyAccount, :452-455 throws "Unsupported payment type for a settlement allocation."
log: SettlementAllocationRequest is the one client-bound kassa DTO with a PaymentType: 999 binds, then dies at :454 before any row exists. Only 3 `new JournalPaymentLine` sites exist.
log: Online-rail txs cannot reach RETREC either (RequireCashPoint:1391, JournalEntryId:505, resolver:26-35). LATENT NOT LIVE: FinalizeCardSaleAsync:68 takes all but NotSet, its caller is a constant.
log: JOURNAL/C1: JournalPaymentLine.PaymentType uses EnumToStringConverter (DbContext:855-857), so 999 persists as "999" permanently on an append-only table. C6 engaged (§ 2-8-7 kvittering).
log: X/Z copies the ladder byte-identically (EscPosXZReportBuilder:341-354), so a builder fix needs doing twice. DESIGN CALL FRAMED NOT SETTLED: DTO vs service vs builder. No fix/suite/container/SQL.
END RETURN
```
