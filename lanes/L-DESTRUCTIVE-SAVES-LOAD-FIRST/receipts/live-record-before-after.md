# Live before/after capture — L-DESTRUCTIVE-SAVES-LOAD-FIRST

Baseline measured against: Web-modules HEAD: 8ac6f63648015d8c7a230181a7f07bf303d43268  branch: lane/focustrap-teardown | core submodule HEAD: 1bcab0b6b3882bc232795437d7ad48455a5af0a6  branch: lane/core-ore-label
Record held by a local HTTP server at http://127.0.0.1:4893 (loopback, asserted). Never production.
Credential VALUES redacted; a sha256 prefix proves the value changed without printing it.

## ARM 1a — pre-fix pages/admin/dintero.vue, open page, press Save

| field | stored before | stored after |
|---|---|---|
| `dinteroAccountId` | "T11112222" | "" |
| `clientId` | "PROBE-FAKE-client-id" | "" |
| `clientSecret` | <redacted sha256:6cd4a5250148> | <redacted sha256:e3b0c44298fc> |
| `vippsEnabled` | true | false |
| `applePayEnabled` | true | false |
| `creditCardEnabled` | true | false |
| `klarnaEnabled` | true | false |
| `kraviaEnabled` | true | false |
| `kraviaMessage` | "Faktura sendes fra Kravia innen 3 virkedager." | null |
| `splitSellerId` | "P00001111" | "" |
| `commissionPercentage` | 2.45 | 0 |
| `woltDeliveryFeePercent` | 12.5 | 0 |
| `woltCustomerDeliveryFeeAmount` | 4900 | 0 |
| `woltServiceFeeAmount` | 990 | 0 |

14 of 17 stored fields destroyed by one Save.

## ARM 1b — pre-fix pages/admin/surfboard.vue, load store, change nothing, press Save

| field | stored before | stored after |
|---|---|---|
| `tipsEnabled` | true | false |

A save that changed nothing changed 1 stored field(s).

## ARM 2a — the same bytes, through the fixed core/services/store-service.ts

- unread record + whole-looking payload -> refused `not-loaded`; 0 stored fields changed
- record read + payload short of `kraviaMessage` -> refused `incomplete`; 0 stored fields changed
- refusal text names field names only: ["kraviaMessage"]

## ARM 2b — the same bytes, through the fixed core/services/store-service.ts

- payload short of `tipsEnabled` -> refused `incomplete`; stored `tipsEnabled` still true
- whole payload -> accepted; stored `tipsEnabled` still true

Receipt written by lanes/L-DESTRUCTIVE-SAVES-LOAD-FIRST/live-record.probe.js.
