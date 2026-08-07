<template>
  <AdminPage full-width @login-success="init">
    <div class="ff-page">
      <div class="ff-page__header">
        <h1 class="ff-page__title">
          {{ $i('ff_page_title') }}
        </h1>
        <p class="ff-page__intro">
          {{ $i('ff_page_intro') }}
        </p>
      </div>

      <transition name="ff-toast">
        <div v-if="toast.show" class="ff-page__toast" :class="'ff-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="blocker" class="ff-page__blocker">
        {{ blocker }}
      </div>

      <template v-else>
        <div class="ff-page__controls">
          <button class="ff-page__btn ff-page__btn--ghost" :disabled="loading || busy" @click="reload">
            {{ $i('ff_reload') }}
          </button>
        </div>

        <!-- The two things an operator has to be told before they read a single row, both of them
             about what a value on this page does NOT mean. Neither is a warning about a fault: they
             are the shape of the API, and an operator who does not know them will draw a wrong
             conclusion from a correct answer. -->
        <p class="ff-page__notice">
          {{ $i('ff_effective_note') }}
        </p>
        <p class="ff-page__notice">
          {{ $i('ff_withheld_note') }}
        </p>
        <!-- The catalog read is what says which keys the PUT will accept. Without it every toggle
             below is a guess about whether the write is admissible, and the page says so rather than
             drawing controls it cannot vouch for. -->
        <p v-if="!board.catalogRead" class="ff-page__notice ff-page__notice--warn">
          {{ $i('ff_catalog_unknown') }}
        </p>

        <p v-if="boardUnknown" class="ff-page__notice ff-page__notice--warn">
          {{ $i('ff_read_failed') }}
        </p>

        <section v-for="group in board.modules" :key="group.module || '-'" class="ff-module">
          <h2 class="ff-module__title">
            {{ group.module || $i('ff_module_unknown') }}
          </h2>

          <div v-for="row in group.rows" :key="row.flagKey" class="ff-row" :class="{ 'is-on': row.state === true }">
            <div class="ff-row__head">
              <div class="ff-row__naming">
                <span class="ff-row__title">{{ row.title || row.flagKey }}</span>
                <code class="ff-row__key">{{ row.flagKey }}</code>
              </div>
              <span class="ff-row__badge" :class="'ff-row__badge--' + stateTone(row)">{{ stateLabel(row) }}</span>
            </div>

            <div class="ff-row__facts">
              <span class="ff-row__fact">{{ row.defaultEnabled ? $i('ff_default_on') : $i('ff_default_off') }}</span>
              <span class="ff-row__fact">{{ overrideLabel(row) }}</span>
              <span class="ff-row__fact" :class="{ 'is-warn': row.effective === false }">{{ effectiveLabel(row) }}</span>
            </div>

            <!-- The setting says on and the module's gate still resolves off. The operator is looking
                 at the one case where flipping this switch changes nothing, and the API told us so —
                 it would be a lie by omission to draw the row as simply "on". -->
            <p v-if="overruled(row)" class="ff-row__warn">
              {{ $i('ff_overruled') }}
            </p>

            <p v-if="row.state === null" class="ff-row__warn">
              {{ $i('ff_state_unknown_row') }}
            </p>

            <p v-if="row.isOverridden" class="ff-row__meta">
              {{ $i('ff_updated_by', { actor: row.updatedByReference || $i('ff_actor_unknown') }) }}
              <template v-if="row.updatedAtUtc">
                — {{ formatTime(row.updatedAtUtc) }}
              </template>
              <template v-if="row.note">
                — {{ row.note }}
              </template>
            </p>

            <!-- What must already be true before this switch goes on — printed on the row, directly
                 above the control, because that is the moment it is read. It is a DISCLOSURE: the
                 API enforces none of it, and neither does this page. -->
            <p
              v-if="preconditionKey(row)"
              class="ff-row__precondition"
              :data-precondition="row.flagKey"
            >
              {{ $i(preconditionKey(row)) }}
            </p>

            <!-- What OFF does to this module, for the flags where "off" does not mean "gone". Above
                 the control for the same reason the precondition is: it is read at the moment of the
                 click, by someone who may be mid-incident and expecting the module to disappear. -->
            <p
              v-if="offBehaviourKey(row)"
              class="ff-row__offmeaning"
              :data-off-meaning="row.flagKey"
            >
              {{ $i(offBehaviourKey(row)) }}
            </p>

            <!-- A key the catalog does not carry is not writable: the PUT answers 400 for it. No
                 toggle is drawn, because an affordance certain to be refused is worse than none. -->
            <p v-if="row.writable === false" class="ff-row__warn">
              {{ $i('ff_not_writable') }}
            </p>

            <template v-else>
              <label class="ff-row__note">
                <span class="ff-row__note-label">{{ $i('ff_note_label') }}</span>
                <input
                  v-model="notes[row.flagKey]"
                  type="text"
                  :placeholder="$i('ff_note_placeholder')"
                  :disabled="busy"
                >
              </label>

              <div class="ff-row__actions">
                <button
                  class="ff-page__btn"
                  :disabled="busy"
                  :data-flag-on="row.flagKey"
                  @click="setFlag(row, true)"
                >
                  {{ $i('ff_turn_on') }}
                </button>
                <button
                  class="ff-page__btn ff-page__btn--danger"
                  :disabled="busy"
                  :data-flag-off="row.flagKey"
                  @click="setFlag(row, false)"
                >
                  {{ $i('ff_turn_off') }}
                </button>
                <button
                  v-if="row.isOverridden"
                  class="ff-page__btn ff-page__btn--ghost"
                  :disabled="busy"
                  :data-flag-clear="row.flagKey"
                  @click="clearFlag(row)"
                >
                  {{ $i('ff_clear') }}
                </button>
              </div>
            </template>
          </div>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import { StoreFeatureFlagReader, isPlatformApiError } from '~/utils/platform/feature-flags-client';
import { buildBoard, isOverruled, BOARD_UNKNOWN } from '~/utils/platform/flag-board';

// The operator's lever on the per-store module flags.
//
// WHY THIS PAGE EXISTS. Six modules gate their write surfaces on `workforce.*`, `Margin.*`,
// `training.*`, `Events.Core`, `meals.*` and `growth.*` flags, every one of them deny-closed by
// default, and until now the ONLY way to move any of them was `curl` against
// `PUT /stores/{id}/feature-flags`. Five independent module reviews each reported the same
// consequence from a different direction: a chef meets a module-off blocker on every Margin page, a
// host reads "Events is off" with no way to turn it on, and nobody can take Workforce publication
// down during an incident. The routes were all there; the lever was not.
//
// IT IS SCOPED TO THE CATALOG, NOT TO ONE MODULE. Every flag the backend catalog carries is drawn
// here, grouped by its owning module, so the other five modules gain the same lever from this one
// change rather than each growing a settings screen of its own.
//
// WHAT IT DELIBERATELY DOES NOT DO. It does not read or write the deployment-wide config switches
// (`Growth:Enabled`, `Events:Enabled`, `Margin` config): those are `appsettings`/environment, not
// data, and no endpoint exposes them. Their invisibility is exactly why `effective: true` is not a
// promise on this surface, which is stated on screen rather than left to be discovered.

// Flags whose OWNER states a precondition that must hold before the switch goes on, and that nothing
// in the estate enforces.
//
// `Events.Deposits` is the only one today. `EventsFeatureFlags.Deposits` says, in the backend's own
// words, that a store may be given the deposit money path only once its payment-provider
// configuration has already processed live orders — deposits reuse proven merchant config and
// configure nothing of their own — and that enabling it for a store that never took a live payment
// "is currently possible and is a procedural failure, not a technical one". Before this page that
// arming was a curl; it is now one click, so the sentence has to be where the click happens.
//
// IT IS A DISCLOSURE, NOT A GATE. There is no notion of "proven merchant configuration" in the code
// and no ruling that says arming should be refused without one, so nothing here blocks, warns
// conditionally, or claims the API will refuse — all three would be inventions. A flag absent from
// this map carries no precondition text at all rather than a generic one; a blanket note at the top
// of the page would be read as covering all eighteen rows, which is a different and false claim.
const FLAG_PRECONDITIONS = {
  'Events.Deposits': 'ff_precondition_events_deposits',
  // Every other switch on this page makes a surface readable or a write admissible, and pressing it
  // back undoes it. This one posts guest contact details outward over the deployment's mail transport,
  // and a message that has left cannot be recalled. It also does not release "from now on": the drain
  // takes the whole backlog that accumulated while it was off, so the size of what goes out is the
  // queued count on the Events pipeline, not zero. Both are read at the click or not at all.
  'Events.Dispatch': 'ff_precondition_events_dispatch'
};

// What turning a flag OFF actually does to the module — stated on the row, for the flags whose
// answer is not the one the word "off" suggests.
//
// WHY THIS IS NOT ONE SENTENCE AT THE TOP. It used to be: `ff_page_intro` promised, for all six
// modules at once, that a switch which is not on "refuses writes — reads and exports of what is
// already recorded keep working". That is true of Training and FALSE of Events, whose gate answers
// 404 `EVENTS_DISABLED` and takes the whole module dark, reads included
// (`Services/Events/EventsModuleGate.cs`: "False ⇒ the caller returns 404 … the module is invisible
// for this store"). A promise that holds for some modules and not others is not information, so the
// intro no longer makes it and the rows that can back it make it themselves.
//
// TRAINING'S ANSWER, read off `Services/Training/TrainingModuleGate.cs` rather than off the flag.
// Its eight read paths call `EnsureVisibleAsync`, which consults no flag beyond visibility; its
// writes call `EnsureWritableAsync(flag)`, which — flag off, store visible — throws
// `FlagDisabledReadOnly` (409 `training.flag-disabled-read-only`). Visible means `training.setup` on
// OR any TrainingCourses/Certificates/Assignments/Completions row for the store. So off refuses the
// write and leaves the lists, the form and its live submit exactly where they were, and a journey
// walked precisely that. The one case where the module DOES vanish is a store that has never
// recorded anything, and only `training.setup` decides it — which is why the two rows say different
// things instead of sharing one sentence.
//
// KEYED ON THE EXACT KEY, like the preconditions above and for the same reason: the five withheld
// `training.*` flags gate nothing today, and a prefix match would put this behaviour claim on the
// first of them that is ever advertised, whatever gate it turns out to have.
const FLAG_OFF_BEHAVIOUR = {
  'training.setup': 'ff_off_training_setup',
  'training.assignments': 'ff_off_training_assignments',
  // Read off `EventsNotificationDrainService`: the switch is resolved before the batch is drawn, so a
  // withheld store's rows are never selected at all — status, attempt count and next-attempt time
  // untouched, nothing spent and nothing deleted. Staff keep issuing links and the queue keeps growing
  // behind the switch, which is the opposite of what "off" suggests and is why turning it back on is
  // not a fresh start.
  'Events.Dispatch': 'ff_off_events_dispatch'
};

export default {
  name: 'AdminFeatureFlags',
  components: { AdminPage },
  data () {
    return {
      loading: false,
      busy: false,
      blocker: '',
      catalog: null,
      states: null,
      forbidden: false,
      // Per-flag operator note, keyed by flag key. Held separately from the rows because it is the
      // operator's INTENT for the next write and not something the server has said.
      notes: {},
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    _flagService () {
      return new StoreFeatureFlagReader(this._coreInitializer);
    },
    board () {
      return buildBoard({ catalog: this.catalog, states: this.states, forbidden: this.forbidden });
    },
    // Nothing about this store's flags was answered. Kept off the template as a literal so the page
    // and the board cannot drift about what the word means.
    boardUnknown () {
      return this.board.status === BOARD_UNKNOWN;
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      await this.reload();
    },

    async reload () {
      this.loading = true;
      this.blocker = '';
      this.forbidden = false;
      // Cleared to unknown, not to empty: a read in flight must not render as a store with no flags,
      // which is a different claim and the one an operator would act on.
      this.catalog = null;
      this.states = null;

      // Two independent reads with different auth: the catalog admits any authenticated caller, the
      // store read only a StoreAdmin. A catalog failure must not black out a page whose store read
      // succeeded — it only makes WRITABILITY unknown, which the board reports.
      const [catalog, states] = await Promise.all([
        this._flagService.GetCatalog().catch(() => null),
        this._flagService.GetStoreFlags(this.storeId).catch((e) => { this.recordStoreReadFailure(e); return null; })
      ]);

      this.catalog = Array.isArray(catalog) ? catalog : null;
      this.states = Array.isArray(states) ? states : null;
      // Seeded in ONE assignment rather than key by key: Vue 2 does not make a property added to an
      // existing object reactive, so a note typed into a key this object did not already carry would
      // be held but never re-rendered. Prefilled with the note the server has, because an operator
      // editing an override is usually amending the reason it was set rather than writing a new one.
      const notes = {};
      (this.states || []).forEach((row) => {
        if (row && row.flagKey) { notes[row.flagKey] = (row.isOverridden && row.note) || ''; }
      });
      (this.catalog || []).forEach((entry) => {
        if (entry && entry.flagKey && notes[entry.flagKey] === undefined) { notes[entry.flagKey] = ''; }
      });
      this.notes = notes;
      this.loading = false;
    },

    /**
     * A 403 here is the API's concealment answer — "not a StoreAdmin of this store" and "no such
     * store" are deliberately the same refusal, so the page must not turn it into either sentence on
     * its own. Anything else leaves the board UNKNOWN, which reads as "not answered" rather than as
     * a store with every flag off.
     */
    recordStoreReadFailure (error) {
      if (isPlatformApiError(error) && error.status === 403) {
        this.forbidden = true;
        this.blocker = this.$i('ff_forbidden');
      }
      return null;
    },

    /**
     * The write. The response is the flag's state AFTER the write and is adopted whole — including
     * its `effective`, which is NOT the value just sent: turning a stage flag on under a master that
     * is off answers `overrideEnabled:true, effective:false`, and that disagreement is the single
     * most useful thing this page can show. Re-deriving it here from the request would erase it.
     */
    async setFlag (row, enabled) {
      if (this.busy || row.writable === false) { return; }
      this.busy = true;
      try {
        const note = this.notes[row.flagKey] || null;
        const updated = await this._flagService.SetStoreFlag(this.storeId, row.flagKey, enabled, note);
        this.adopt(updated);
        this.notify(this.$i(enabled ? 'ff_saved_on' : 'ff_saved_off', { flag: row.flagKey }));
      } catch (e) {
        this.notifyError(e);
      } finally {
        this.busy = false;
      }
    },

    /**
     * Clearing reverts the flag to its module default. The response says only `{ flagKey, cleared }`
     * — it does NOT carry the resulting state — so the store is re-read rather than the default being
     * assumed: for a flag with an effective-resolver the post-clear value is a data probe's answer,
     * not the advertised default, and printing the default would be inventing it.
     */
    async clearFlag (row) {
      if (this.busy || row.writable === false) { return; }
      this.busy = true;
      try {
        const result = await this._flagService.ClearStoreFlag(this.storeId, row.flagKey);
        this.states = await this._flagService.GetStoreFlags(this.storeId)
          .then(states => (Array.isArray(states) ? states : null))
          .catch((e) => { this.recordStoreReadFailure(e); return null; });
        this.notify(result && result.cleared === false
          ? this.$i('ff_clear_none', { flag: row.flagKey })
          : this.$i('ff_cleared', { flag: row.flagKey }));
      } catch (e) {
        this.notifyError(e);
      } finally {
        this.busy = false;
      }
    },

    /** Replaces one row in the store read with the state the write answered with. */
    adopt (updated) {
      if (!updated || !updated.flagKey) { return; }
      const states = Array.isArray(this.states) ? this.states.slice() : [];
      const index = states.findIndex(row => row && row.flagKey === updated.flagKey);
      if (index >= 0) { states.splice(index, 1, updated); } else { states.push(updated); }
      this.states = states;
    },

    overruled (row) {
      return isOverruled(row);
    },
    /**
     * The i18n key of this flag's arming precondition, or null when its owner states none. Keyed on
     * the exact catalog key: `Events.Deposits` is a rollout contract the backend documents as having
     * to stay stable, so an exact match is the right strictness — a prefix match would silently put
     * the deposit sentence on a future `Events.DepositsSomethingElse` that never claimed it.
     */
    preconditionKey (row) {
      return (row && Object.prototype.hasOwnProperty.call(FLAG_PRECONDITIONS, row.flagKey))
        ? FLAG_PRECONDITIONS[row.flagKey]
        : null;
    },
    /**
     * The i18n key describing what this flag being OFF does to its module, or null when no owner has
     * had that read out of its gate. Exact-key, never a prefix: see `FLAG_OFF_BEHAVIOUR`.
     *
     * Deliberately independent of `row.state`. It is a standing property of the flag, not a reaction
     * to the value this store happens to hold — an operator about to press "off" has to read it
     * BEFORE the value changes, which is the only moment it can still prevent anything.
     */
    offBehaviourKey (row) {
      return (row && Object.prototype.hasOwnProperty.call(FLAG_OFF_BEHAVIOUR, row.flagKey))
        ? FLAG_OFF_BEHAVIOUR[row.flagKey]
        : null;
    },
    stateLabel (row) {
      if (row.state === null) { return this.$i('ff_state_unknown'); }
      return row.state ? this.$i('ff_state_on') : this.$i('ff_state_off');
    },
    stateTone (row) {
      if (row.state === null) { return 'unknown'; }
      if (isOverruled(row)) { return 'overruled'; }
      return row.state ? 'on' : 'off';
    },
    overrideLabel (row) {
      if (row.isOverridden === null) { return this.$i('ff_override_unknown'); }
      return row.isOverridden ? this.$i('ff_overridden') : this.$i('ff_not_overridden');
    },
    effectiveLabel (row) {
      if (row.effective === null) { return this.$i('ff_effective_unknown'); }
      return row.effective ? this.$i('ff_effective_on') : this.$i('ff_effective_off');
    },
    formatTime (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) { return value; }
      return new Intl.DateTimeFormat(this.locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },
    notifyError (e) {
      // The server's own sentence when it gave one (`Unknown feature flag: …` is actionable prose),
      // never a sentence invented here about a refusal we did not classify.
      this.notify((e && e.message) || this.$i('ff_generic_error'), 'error');
    }
  }
};
</script>

<style scoped>
.ff-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.ff-page__header { margin-bottom: 18px; }
.ff-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.ff-page__intro { color: #64748b; margin: 0; }

.ff-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.ff-page__toast--success { background: #159f63; }
.ff-page__toast--error { background: #ef4444; }
.ff-toast-enter-active, .ff-toast-leave-active { transition: opacity 0.25s ease; }
.ff-toast-enter, .ff-toast-leave-to { opacity: 0; }

.ff-page__blocker { padding: 18px 20px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }
.ff-page__controls { display: flex; justify-content: flex-end; margin-bottom: 12px; }

.ff-page__notice { padding: 10px 16px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; margin: 0 0 10px; font-size: 0.86rem; }
.ff-page__notice--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }

.ff-page__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.ff-page__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.ff-page__btn--danger { background: #fff; color: #ef4444; border: 1px solid #ef4444; }
.ff-page__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }

.ff-module { margin-top: 24px; }
.ff-module__title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 10px; }

.ff-row { padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.ff-row.is-on { border-color: rgba(27, 183, 118, 0.4); }
.ff-row__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ff-row__naming { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ff-row__title { font-weight: 600; color: #292c34; }
.ff-row__key { font-family: monospace; font-size: 0.78rem; color: #94a3b8; }
.ff-row__badge { padding: 4px 12px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.02em; }
.ff-row__badge--on { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.ff-row__badge--off { background: #f1f5f9; color: #64748b; }
.ff-row__badge--overruled { background: #fef3c7; color: #92400e; }
.ff-row__badge--unknown { background: #f8f9fa; color: #94a3b8; border: 1px dashed #cbd5e0; }

.ff-row__facts { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; }
.ff-row__fact { color: #94a3b8; font-size: 0.78rem; }
.ff-row__fact.is-warn { color: #92400e; }
.ff-row__warn { margin: 8px 0 0; padding: 8px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 0.82rem; }
/* Deliberately NOT `ff-row__warn`. A warn box on this page means the server told us something is
   wrong right now; this is a standing condition that is true whatever the row says, and reading the
   two as the same thing is what makes a permanent banner invisible. Same amber family so it still
   reads as caution on a money path, a left rule instead of a filled box so it reads as standing. */
.ff-row__precondition { margin: 10px 0 0; padding: 8px 12px; border-left: 3px solid #92400e; background: #fffdf5; color: #92400e; font-size: 0.82rem; line-height: 1.45; }
/* Standing, like the precondition — a left rule rather than a filled box — but deliberately NOT
   amber. Amber on this page means caution about a money path or a fault the server has reported;
   this is neither. It is the plain answer to "what does off do here", it is true whichever way the
   row is set, and it has to stay legible rather than decorative: full-strength body colour, because
   an operator mid-incident is going to read this sentence and act on it. */
.ff-row__offmeaning { margin: 10px 0 0; padding: 8px 12px; border-left: 3px solid #64748b; background: #f8f9fa; color: #292c34; font-size: 0.82rem; line-height: 1.45; }
.ff-row__meta { margin: 8px 0 0; color: #94a3b8; font-size: 0.78rem; }

.ff-row__note { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
.ff-row__note-label { font-size: 0.74rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.ff-row__note input { padding: 9px 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.ff-row__note input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }

.ff-row__actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
</style>
