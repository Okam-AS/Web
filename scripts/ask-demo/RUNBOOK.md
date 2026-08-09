# Ask Okam — the walk

Quarter of an hour, one browser, one terminal. `demo.sh` builds the world and arms the flags; this
document is what to do once it has. § 1–3 and § 5 are the ten-minute spine; § 4 is the closure case,
and it is the one worth staying for.

```sh
export AskModel__Gemini__ApiKey=...        # without this every question fails, see § 0
./scripts/ask-demo/demo.sh
```

Sign in at `http://localhost:3001/admin` as **99999999 / 123123**, then open
**Spør Okam** in the sidebar (Operations group, under Statistikk).

---

## § 0. What has to be true before any of this is interesting

Four things, and the demo script names each one it cannot find rather than guessing:

| input | why it matters | if absent |
| --- | --- | --- |
| a model credential (`AskModel__Gemini__ApiKey`) | every turn calls the provider | the page renders perfectly and **every question returns a technical error** — the most expensive way for this demo to fail, because everything looks built |
| a running mssql container | the world is built on a SQL server that is **already up** | the script refuses; it never starts one, because this host OOM-kills past about three |
| `../OkamAPI-ask` on `feature/ask-okam` | it carries `Scripts/demo/demo-up.sh` | run the world yourself and re-run with `SKIP_WORLD=1` |
| a populated `core/` | the admin web will not build without it | the script prints the exact submodule command |

**The five flags are the point of the script.** `Assistant.Module`, `Assistant.Actions`,
`Assistant.Actions.MenuPriceChange`, `Assistant.Actions.DiscountCreate` and
`Assistant.Actions.StoreHoursChange` all ship **deny-closed**, and the gate ANDs them. With any one
off, the assistant still answers questions perfectly well and simply never offers to change anything
— which reads as *"this half was never built"* rather than *"it is switched off"*. Step 3 sets all
five through the real operator lever and **reads them back** before claiming they are on.

**Two things about the hours kind you need before § 4.**

1. `store_hours_change` can be staged **only by asking in the chat box**. There is no MCP tool and no
   HTTP route for it, unlike the discount and price kinds — so it cannot be hand-staged, and without
   a live model key § 4 cannot be walked at all. Nothing else in this runbook depends on that.
2. **Step 5 opens the store seven days a week, 11:00–22:00, and that is not decoration.** A store
   with no opening-hours rows reads as *closed every day*, so asking to close Mondays would be
   refused as a change that alters nothing — no card, and a walk that dead-ends looking exactly like
   a broken feature. The script reads the seven open days back before claiming it seeded them.

---

## § 1. It answers (2 min)

Type: **`Hvor mye solgte vi forrige uke?`**

Expect: prose, and — depending on what the world holds — a metrics row and a table.

Now press **Vis grunnlaget**. This is the honest half of the surface:

- **Forutsetninger** and **Forbehold** — what the answer assumed and what it is hedging.
- **Slik ble svaret laget** — the tools that ran, the store scope the answer used, how many rounds,
  why the loop stopped, and the model.

Two things you will notice are *missing*, and both are missing on purpose:

- **No SQL.** `ChatTrace.Sql` is set to `null` unconditionally by the orchestrator, so a row for it
  would be permanently empty.
- **Period is often absent.** It is not a field on the trace; it lives inside `ToolArguments`, which
  a model-selected call frequently leaves empty. The drawer omits the row rather than showing a
  blank one.

---

## § 2. It will not pick your store for you (1 min)

The picker at the top defaults to **all** the stores you administer. Leave it there and type:

> **`Øk prisen på alle pizzaer med 25 %`**

If your account administers more than one store, the turn comes back asking **which** one, with a
button per venue. The assistant is *not allowed* to choose: a write that spans several venues has no
single target, and the runner refuses rather than guessing. Press a venue and it re-asks scoped to
exactly that store.

**The suggestion chip is the same principle from the other side.** Mention a store by name in a
question — `Hvor mye solgte Bryggen Bistro i går?` — while the picker is set to something else, and a
chip appears offering to switch. It is *offered and never applied*. A sentence does not get to choose
which store a change lands on; you do.

---

## § 3. The proposal card — read the number twice (4 min)

With one store selected, ask again:

> **`Øk prisen på alle pizzaer med 25 %`**

**Nothing has changed yet.** What you get is a card:

- **Tittel** and plain words — what it proposes, in a sentence.
- **A change table** — each dish, the field, before and after, in kroner. The money on the wire is
  **øre as an integer**; the card formats it.
- **Butikk**, **Gjelder** (the effective window; `inntil videre` when open-ended) and **Grunnlag**.
- **Utløper om** — a live countdown. The card is dead after 48 hours and can never execute.

### The line that matters most

If the change set is larger than **50 rows**, the card says:

> *Viser 50 av N endringer. Godkjenning skriver alle N.*

This is not decoration. The server truncates the change set to a 50-row **sample** and reports the
full blast radius separately as `AffectedCount`; **no endpoint returns the untruncated set.** Without
that line a merchant reads fifty rows and approves N. Four pizzas will not trigger it — to see it,
seed a menu with more than fifty products and reprice the lot.

### Two steps, and the second one counts out loud

Press **Godkjenn**. It does not approve. It replaces the buttons with a question, and the confirm
button names the **full** count:

> **Godkjenn — skriv disse 3 prisene**

Press it. Now the prices are written. Check `/admin/products`: the three pizzas moved, **Tiramisu did
not**. That is why the demo seeds a non-pizza — a reprice that hit everything would look identical on
a menu where everything is a pizza.

Press **Avslå** on a different proposal instead and it is turned down, terminally.

---

## § 4. Closing a day — the walk that can hide a false success (5 min)

This is the one journey where a card could historically have claimed success while changing nothing,
so it gets its own section and its own ground truth. Read the card before you approve it; the whole
point is what is *on* it.

**Before you ask, write down what Monday is now.** Open `/admin/index` → **Åpningstider**. It lists
all seven days; a shut day reads **Stengt**, never a blank. Straight after `demo.sh` every day reads
**11:00 - 22:00**, Monday included — if Monday already says *Stengt*, step 5 did not take, and the
ask below will be correctly refused as a no-op rather than producing the card this section is about.

Then, with one store selected, ask:

> **`Vi holder stengt på mandager fra nå av.`**

### What has to be on the card

**This card has no change table, and that is correct.** The price card's table is typed in *money*,
and an opening time is not money — so this kind states its days in **prose** instead: the sentence
under the title, and the same sentence repeated as the single bullet beneath it. Do not go looking
for a table; the days are the thing to read.

- **Tittel: `Closed on Monday`.** Day names on this card are **English by design** — the same voice
  as the other two kinds. Norwegian tables elsewhere use a different day-name helper.
- **The diff names every day the proposal touches, with the word `closed` spelled out**, e.g.
  `Monday 11:00–22:00 → closed · Tuesday 11:00–22:00 (unchanged) — nothing is live yet.`
  A day it leaves alone is marked `(unchanged)`. A closed day is **never** a blank or `00:00–00:00`:
  an empty span is the one thing a reader takes for "unchanged".
- **The confirm does not count rows here.** With no change table there is nothing to count, so the
  two-step reads *"Er du sikker? Endringen skjer med én gang."* and **"Godkjenn — gjennomfør
  endringen"** — not the *"skriv disse 3 prisene"* wording from § 3. A count of **0** anywhere would
  be a defect; the absence of a count is not.

> **THE CHECK THIS SECTION EXISTS FOR.** Monday must be named in the card's own words **before you
> approve**, with `closed` as its after-value. The underlying writer only touches days its payload
> names, so a day cannot be closed by being left out — the executor has to send Monday explicitly
> shut. **If the card never names Monday and the approve then reports success, stop the walk: that
> is a release blocker, not a cosmetic gap.**

### After you approve

1. **`/admin/index` → Åpningstider.** Monday reads **Stengt**. This is the page the storefront
   obeys, so this is the verdict.
2. **Genuinely shut, not merely absent.** A closure *keeps* the day's stored times — `Open=false`
   alone closes it — so "closed on Mondays" never destroys the schedule you reopen to. A writer that
   had zeroed them would look **identical** on that list, so the list cannot tell you. One read can:

   ```sql
   SELECT DayOfWeek, [Open], OpeningTime, ClosingTime FROM OpeningHours
   WHERE StoreId = <id> AND DayOfWeek = 0;   -- 0 is Monday in this column
   ```

   Expect `Open = 0` with **OpeningTime and ClosingTime still populated**. Blank times there mean the
   closure threw the hours away — a finding worth reporting even though the day is correctly shut.

   ⚠️ **Do not check this by toggling Monday back on in the UI.** That switch has `@change` wired
   straight to the save, so it writes the moment you touch it: you would reopen the day you just
   closed and overwrite the very thing you were inspecting.
3. **Ask the assistant.** `Har vi åpent på mandag?` — the weekly plan now reports Monday shut.

### While you are on that page: dated closures are a different mechanism

Below Åpningstider, `/admin/index` has **Spesielle dager** — dated overrides ("stengt 24. desember"),
which beat the weekly plan on their date. `Vi holder stengt på mandager` is a *weekly* change and
never touches them. Ask `Når har vi åpent denne uka?` and the answer now carries both: rows under
**Kilde** marked `Ukeplan`, and any dated ones marked `Unntaksdag` with their date, plus a line
stating how far ahead it looked. If no dated exception falls in that window the answer says so
outright — the one thing it must never do is stay silent, because a merchant reading a weekly plan
cannot tell the difference between "nothing is booked" and "this tool cannot see them".

### Then the no-op probe

Ask **exactly the same thing again**. Expect: **no card**. The executor refuses a change that "would
leave every one of those days exactly as it is", so nothing is staged.

**Be ready for what the answer does *not* say.** The refusal's own sentence is deliberately withheld
from the model — executor prose is never quoted back into a turn — so the assistant tells you only
that nothing was prepared, never that it was because Monday is already shut. That is the same silent
refusal a nonsense discount gets. It is a deliberate trade, and § 7 lists it as one.

---

## § 5. The inbox (2 min)

Open the **Venter på deg** tab.

Everything staged for the selected stores is here, newest first, filtered to `Staged` by default.
It polls every six seconds — there is no websocket or SSE anywhere in this application, and this
inbox did not introduce the first one.

**One spine, one inbox.** A proposal staged from this chat box and one staged over MCP by SocialChef
render through the *same card* with the *same approval*. The only difference is a small source label
— `Fra Spør Okam` / `Fra en tilkoblet app`. There is deliberately no special chrome for either:
giving one its own styling would teach you that the two are different kinds of promise, and they are
not.

### Things worth doing to it

- **Approve the same card twice.** Open the page in two tabs, approve in one, then approve in the
  other. The second returns the *recorded* outcome — `Dette forslaget var allerede gjennomført.
  Ingenting ble gjort på nytt.` It does not create a second effect.
- **Turn the kind off mid-flight.** Stage a price change, then in `/admin/feature-flags` switch
  `Assistant.Actions.MenuPriceChange` off, then approve. You get the one refusal this API makes
  machine-readable: *"Denne handlingstypen er slått av … Forslaget står fortsatt"* — and **the card
  stays on screen**, because turning the flag back on lets that same proposal approve. Every other
  409 removes the card, because the row has already moved.
  **Check the venue while you are there.** The flags page names the store it is writing to, at the
  top, above the switches — and on a multi-store account it is a picker, not a default. Flags are
  per-store, so a switch flipped on the wrong venue looks exactly like a switch that does nothing.
- **Let one expire.** `ExpiresAt` is `CreatedAt + 48h`, so this one needs patience or a clock.

### If an approve dies mid-flight

Kill the API between the claim and the write — a crash, a Ctrl-C at the wrong moment — and that row
sits in `Executing` forever: approve and reject both 409 from then on. **Nothing local will rescue
it.** The reaper that recovers abandoned claims is off in Development (`MaintenanceSettings:Enabled`
is `false`), it leases through Redis, and it will not touch a claim younger than five minutes — so
even switched on it is not a demo-speed recovery. Do not change the scheduling to find out.

Stage a fresh proposal and carry on. If you want that row cleared, one statement does it:

```sql
UPDATE StagedActions SET Status = 'Failed', ResolvedAt = SYSDATETIME(),
       FailureReason = 'Cleared by hand during a demo walk'
WHERE Status = 'Executing';
```

Run it against the **demo** database only — via
`docker exec <sql container> /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P <pw> -d <demo db> -Q "…"`.
It is a local walk-around, not a repair: the real recovery path is the reaper, and it is production's.

---

## § 6. The doorway from Statistikk (1 min)

Go to `/admin/statistics`, narrow the store filter, and type a question into the AI box.

It no longer answers there — it **hands over** to `/admin/assistant`, carrying both the question and
the store scope you had already narrowed to. Back returns you to the board.

That box used to answer in place, and it hard-coded `'no'` — so an English or German operator got
Norwegian regardless of the locale they had chosen. That is gone with the call.

> **Correction.** An earlier draft of this runbook also claimed the box read `result.answer` off a
> **PascalCase** wire and so showed *"Kunne ikke få svar fra AI"* for every successful answer. That
> was wrong: the wire is **camelCase** and `result.answer` was correct. The measurement is in the
> header of `utils/assistant/api-client.js`.

---

## § 7. What this walk cannot show you

Named here so the walk is not read as covering more than it does:

- **Why a proposal failed.** `FailureReason` is written to the row and is **not** a member of any
  response model, so a `Stopped` row says so and offers to compose a new ask — it cannot say why.
  There is no reset: the spine has no edge out of `Failed`.
- **Which of seven refusals you hit.** Only `assistant.kind_disabled` carries a machine-readable
  code. The other conflict kinds — and the row's actual current status — collapse into one
  `{ message }` of English server prose, which the card shows verbatim beneath the translated line.
  The UI deliberately does **not** parse that prose; a follow-up backend lane will emit a `code` for
  every kind, and when it lands the branching gets simpler with nothing here thrown away.
- **A margin read on the card.** There is no margin-enrichment block on the proposal card; nothing
  produces one. No UI was built for it.
- **Why a proposal was refused before it became a card.** A discount outside 1–99 %, or an hours
  change that would leave every named day as it is, is turned down at propose time — and the
  executor's own sentence explaining which rule it broke is deliberately **not** handed to the model,
  because executor prose must never be quoted back into a turn. So the merchant is told nothing was
  staged and never why. Safe, and a real cost: § 4's no-op probe and any nonsense-discount probe both
  land here, and whether that trade is acceptable is a ruling, not a bug report.
- **Multi-turn memory.** Every turn is an independent request. The composer says so.

### One thing that looks like a bug and is not

**A card keeps the dish name it was staged with**, even after the dish has been renamed. The card is
rebuilt verbatim from the bytes frozen when the numbers were computed, and that is the point: it
must describe the proposal *as the merchant saw it*. Fetching live product names to "fix" it would
produce a card mixing a current name with frozen prices — describing a change nobody staged.

The same law is why the approve button reads the **live** `action.status` and never the card: the
frozen card carries `needsApproval: true` and live approve/reject links forever, including for rows
that already executed. `GET /staged-actions/{id}` returns `{action, card}` for exactly this reason —
`action` is what you may *do*, `card` is what you *see*.
