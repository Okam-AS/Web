# SQL slot — every measurement this lane took, in order

Instrument: `MemFree` / `MemAvailable` read from `/proc/meminfo` **inside the Docker VM**, via a 64 MB
throwaway `redis:7` container created and removed by this lane (`docker run --rm --memory=64m`). This is
the instrument the brief's own dispatch number matches — "roughly 2 GiB of free pages with one mssql
container already up" is `MemFree`, not `MemTotal` minus the sum of `docker stats`. The latter reads ~5.7 GiB
in the same conditions and would have been wrong by 3.7 GiB.

VM `MemTotal` is 8,024,876 kB (7.65 GiB) at every sample.

| # | time | foreign containers | their mem | mine | `MemFree` | `MemAvailable` | host swap free | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 13:41 | `zealous_mcclintock` + ryuk | 1.943 GiB | — | (not yet read) | — | 1700 MB | keep measuring |
| 2 | 13:56 | `stupefied_mendeleev` + ryuk | 2.923 GiB | — | — | — | 671 MB | keep measuring |
| 3 | 13:58 | `stupefied_mendeleev` + ryuk | 3.167 GiB | — | **1.98 GiB** | 3.84 GiB | 671 MB | **would have been `blocked`** |
| 4 | 13:59 | same | 3.167 GiB | — | **1.79 GiB** | 3.65 GiB | 1008 MB | trend is downward |
| 5 | 14:14 | **none** | — | — | **6.97 GiB** | 7.13 GiB | 1292 MB | **slot free — take it** |
| 6 | 14:16 | none | — | `elegant_jackson` 1.63 GiB | 3.56 GiB | 5.23 GiB | — | my run under way |
| 7 | 14:18 | `amazing_mccarthy` + ryuk (**arrived after mine**) | 1.365 GiB | `elegant_jackson` 2.057 GiB | 1.67 GiB | — | — | leave it alone |

## What that means

- **Samples 3 and 4 are the blocked condition the brief describes**, measured rather than assumed: a foreign
  `mssql:2022-CU14` container was up and free pages were 1.98 then 1.79 GiB, both under the ~3 GiB floor, and
  the foreign container was still *growing* (1.94 → 2.92 → 3.17 GiB over about 17 minutes) because that lane
  was mid-run. Host swap free fell from 1700 MB to 671 MB across the same window and macOS grew the swap file
  from 15,360 MB to 16,384 MB and then 19,456 MB — the host was under real pressure, not a momentary dip.
  Starting a second container there would have risked an OOM-137 on the sibling's run as well as mine.
- **Sample 5 is the slot actually opening.** `docker ps` was empty — the sibling's container and its ryuk had
  both gone — and free pages were 6.97 GiB. No foreign container was running, so the brief's condition for
  blocking did not hold, and the slot was taken then.
- **Sample 7 is a foreign lane arriving after mine was already up.** `amazing_mccarthy` and ryuk
  `670b86c2` are not this lane's; `elegant_jackson` and ryuk `ec9af0b0` are. Nothing foreign was stopped,
  inspected or exec'd into. This is recorded because it is the reason a second SQL run of this lane's own —
  the baseline at `24cd4ead` — cannot simply be started: it would be a third `mssql` on a 7.65 GiB VM.

## Containers this lane created

| name | image | created by | reaped by |
| --- | --- | --- | --- |
| `elegant_jackson` (`23441d9457…`) | `mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04` | this lane's SQL run at `7ac6f2b2` | its own Testcontainers ryuk `ec9af0b0` |
| three `redis:7` probes | `redis:7` | the `MemFree` samples above | `--rm`, immediately |

Nothing else was started, and **no container this lane did not create was stopped, restarted or exec'd
into** at any point.
