# Ask Okam — the walk

Ten minutes, one browser, one terminal. `demo.sh` builds the world and arms the flags; this
document is what to do once it has.

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

**The four flags are the point of the script.** `Assistant.Module`, `Assistant.Actions`,
`Assistant.Actions.MenuPriceChange` and `Assistant.Actions.DiscountCreate` all ship **deny-closed**,
and the gate ANDs them. With any one off, the assistant still answers questions perfectly well and
simply never offers to change anything — which reads as *"this half was never built"* rather than
*"it is switched off"*. Step 3 sets all four through the real operator lever and **reads them back**
before claiming they are on.

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

## § 4. The inbox (2 min)

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
- **Let one expire.** `ExpiresAt` is `CreatedAt + 48h`, so this one needs patience or a clock.

---

## § 5. The doorway from Statistikk (1 min)

Go to `/admin/statistics`, narrow the store filter, and type a question into the AI box.

It no longer answers there — it **hands over** to `/admin/assistant`, carrying both the question and
the store scope you had already narrowed to. Back returns you to the board.

That box used to answer in place, and it was broken: it read `result.answer` (lower case) off a
**PascalCase** wire, so it showed *"Kunne ikke få svar fra AI"* for every answer it successfully
received, and it hard-coded `'no'` so an English or German operator got Norwegian regardless. Both
are gone with the call.

---

## § 6. What this walk cannot show you

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
