<template>
  <AdminPage full-width @login-success="init">
    <div class="gp-page">
      <div class="gp-page__header">
        <h1 class="gp-page__title">
          {{ $i('gp_page_title') }}
        </h1>
        <p class="gp-page__intro">
          {{ $i('gp_page_intro') }}
        </p>
      </div>

      <transition name="gp-toast">
        <div v-if="toast.show" class="gp-page__toast" :class="'gp-page__toast--' + toast.type" data-test="toast">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="blocker" class="gp-page__blocker" data-test="blocker">
        {{ blocker }}
      </div>

      <template v-else>
        <div class="gp-page__controls">
          <button class="gp-btn gp-btn--ghost" :disabled="busy" data-test="reload" @click="init">
            {{ $i('gp_reload') }}
          </button>
        </div>

        <!-- The two facts an operator must hold before reading a row. The first is what the deadline
             below IS — the service's own answer under art. 12(3), computed once by
             `GrowthPrivacyObligation.DueAt` and rendered here unchanged. This page works out no date
             of its own, and a row the response sent none for stays blank rather than being filled in
             from the receipt time. The second is why no name appears anywhere on this page. -->
        <p class="gp-page__note">
          {{ $i('gp_deadline_note') }}
        </p>
        <p class="gp-page__note">
          {{ $i('gp_masked_note') }}
        </p>

        <!-- Unknown, not empty. A read that did not answer must never render as a store nobody has
             asked anything, because those two states call for opposite actions. -->
        <p v-if="queueUnknown" class="gp-page__note gp-page__note--warn" data-test="read-failed">
          {{ $i('gp_read_failed') }}
        </p>

        <p v-else-if="queue.overdueCount" class="gp-page__overdue" data-test="overdue-banner">
          {{ queue.overdueCount === 1
            ? $i('gp_overdue_banner_one')
            : $i('gp_overdue_banner', { count: queue.overdueCount }) }}
        </p>

        <template v-if="!queueUnknown">
          <section class="gp-section">
            <h2 class="gp-section__title">
              {{ $i('gp_open_heading') }}
            </h2>

            <p v-if="!queue.open.length" class="gp-empty" data-test="open-empty">
              {{ $i('gp_open_empty') }}
            </p>

            <article
              v-for="row in queue.open"
              :key="row.requestId"
              class="gp-row"
              :class="{ 'is-overdue': row.isOverdue }"
              :data-request="row.requestId"
            >
              <header class="gp-row__head">
                <div class="gp-row__naming">
                  <span class="gp-row__type">{{ typeLabel(row) }}</span>
                  <span class="gp-row__ref" data-test="reference">
                    {{ $i('gp_reference', { reference: row.requestId, when: stamp(row.receivedAt) }) }}
                  </span>
                </div>
                <span class="gp-row__badge" :class="'gp-row__badge--' + toneFor(row)">
                  {{ stateLabel(row) }}
                </span>
              </header>

              <div class="gp-row__facts">
                <span class="gp-row__fact">{{ $i('gp_contact', { id: row.contactPointId }) }}</span>
                <span v-if="row.dueAt" class="gp-row__fact">{{ $i('gp_due', { when: stamp(row.dueAt) }) }}</span>
              </div>

              <p class="gp-row__clock" :class="{ 'is-overdue': row.isOverdue }" data-test="clock">
                {{ clockLabel(row) }}
              </p>

              <!-- The notice receipt, when one exists. An InProgress row usually has one and it is
                   the reason the request is still open — a transport refused it, so nothing was
                   destroyed. Null prints its own sentence rather than one of the three states. -->
              <p class="gp-row__notice">
                {{ noticeLabel(row) }}
              </p>

              <!-- What FULFILLING does, said in full BEFORE it is offered, because the server
                   executes it in the same call and none of it can be taken back. -->
              <template v-if="confirming === row.requestId">
                <p class="gp-row__warn" data-test="fulfil-warning">
                  {{ row.type === TYPE_ERASURE ? $i('gp_fulfil_erasure_warning') : $i('gp_fulfil_access_warning') }}
                </p>
                <div class="gp-row__actions">
                  <button
                    class="gp-btn gp-btn--danger"
                    :disabled="busy"
                    data-test="fulfil-confirm"
                    @click="fulfil(row)"
                  >
                    {{ busy ? $i('gp_working') : $i('gp_confirm') }}
                  </button>
                  <button class="gp-btn gp-btn--plain" :disabled="busy" data-test="fulfil-cancel" @click="confirming = null">
                    {{ $i('gp_cancel') }}
                  </button>
                </div>
              </template>

              <template v-else>
                <label class="gp-row__reason">
                  <span class="gp-row__reason-label">{{ $i('gp_reason_label') }}</span>
                  <input
                    v-model="reasons[row.requestId]"
                    type="text"
                    :placeholder="$i('gp_reason_placeholder')"
                    :disabled="busy"
                    data-test="reason"
                  >
                </label>

                <div class="gp-row__actions">
                  <button
                    class="gp-btn"
                    :disabled="busy"
                    data-test="fulfil-open"
                    @click="confirming = row.requestId"
                  >
                    {{ $i('gp_fulfil') }}
                  </button>
                  <button
                    class="gp-btn gp-btn--ghost"
                    :disabled="busy || !hasReason(row)"
                    data-test="reject"
                    @click="reject(row)"
                  >
                    {{ $i('gp_reject') }}
                  </button>
                </div>

                <!-- Why the refuse button is closed. A disabled control with no sentence beside it
                     reads as a broken page rather than as a rule. -->
                <p v-if="!hasReason(row)" class="gp-row__hint">
                  {{ $i('gp_reason_required') }}
                </p>
              </template>
            </article>
          </section>

          <section class="gp-section">
            <h2 class="gp-section__title">
              {{ $i('gp_resolved_heading') }}
            </h2>

            <p v-if="!queue.resolved.length" class="gp-empty" data-test="resolved-empty">
              {{ $i('gp_resolved_empty') }}
            </p>

            <article
              v-for="row in queue.resolved"
              :key="row.requestId"
              class="gp-row gp-row--done"
              :data-resolved="row.requestId"
            >
              <header class="gp-row__head">
                <div class="gp-row__naming">
                  <span class="gp-row__type">{{ typeLabel(row) }}</span>
                  <span class="gp-row__ref">
                    {{ $i('gp_reference', { reference: row.requestId, when: stamp(row.receivedAt) }) }}
                  </span>
                </div>
                <span class="gp-row__badge" :class="'gp-row__badge--' + toneFor(row)">
                  {{ stateLabel(row) }}
                </span>
              </header>

              <div class="gp-row__facts">
                <span class="gp-row__fact">{{ $i('gp_contact', { id: row.contactPointId }) }}</span>
                <span v-if="row.resolvedAt" class="gp-row__fact">
                  {{ $i('gp_resolved_at', { when: stamp(row.resolvedAt) }) }}
                </span>
              </div>

              <p class="gp-row__notice">
                {{ noticeLabel(row) }}
              </p>
            </article>
          </section>
        </template>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import { GrowthService } from '~/utils/growth/growth-client';
import { isGrowthApiError } from '~/utils/growth/api-client';
import {
  readQueue, resolveRefusal, QUEUE_UNKNOWN,
  OUTCOME_FULFILLED, OUTCOME_REJECTED, TYPE_ACCESS, TYPE_ERASURE
} from '~/utils/growth/privacy-queue';

const LOCALES = { no: 'nb-NO', en: 'en-GB', de: 'de-DE' };

// The stable `growth.*` codes a route reachable FROM THIS PAGE can throw, mapped to their copy.
// Derived by enumerating the `"growth.*"` literals on `GrowthConsentAdminController.ListPrivacyRequests`
// / `ResolvePrivacyRequest` and `GrowthPrivacyRequestService.ResolveAsync` — not copied wholesale from
// the newsletter page, whose codes belong to routes this one never calls. An unrecognised code falls
// to the generic message rather than rendering a missing translation key at an operator.
//
// `growth.notice_undeliverable` is the one that most needs its own sentence: it is a 503 that means
// the guest's notice was refused, SO NOTHING WAS DESTROYED and the request is still open. Collapsed
// into «something went wrong» an operator would reasonably assume the erasure had half-happened.
const ERROR_KEYS = {
  'growth.not_found': 'gp_error_not_found',
  'growth.reason_required': 'gp_error_reason_required',
  'growth.invalid_resolution': 'gp_error_invalid_resolution',
  'growth.unattributed': 'gp_error_unattributed',
  'growth.notice_undeliverable': 'gp_error_notice_undeliverable',
  'growth.body_required': 'gp_error_body_required'
};

const NOTICE_KEYS = {
  SubmittedToTransport: 'gp_notice_submittedtotransport',
  NotAttempted: 'gp_notice_notattempted',
  AttemptedAndFailed: 'gp_notice_attemptedandfailed'
};

const STATE_KEYS = {
  Received: 'gp_state_received',
  InProgress: 'gp_state_inprogress',
  Fulfilled: 'gp_state_fulfilled',
  RejectedWithReason: 'gp_state_rejectedwithreason'
};

// The venue's answer to a promise the guest has already been given.
//
// WHY THIS PAGE EXISTS. `pages/preferences/communications.vue` prints
// `gr_guest_request_deadline` — «the venue has one month to answer you. That follows from GDPR
// article 12» — and files the request. `GET /v1/growth/stores/{id}/privacy-requests` and
// `POST .../resolution` have been served all along and had ZERO callers, so the row landed in a
// table no human at the venue could see. The deadline was printed at a guest; nothing at the venue
// counted it, and nobody could answer even if they had wanted to.
//
// THE DEADLINE AND THE ORDER ARE THE SERVER'S ANSWER. `GrowthPrivacyRequestListItem.dueAt` is the
// art. 12 date the venue is held to, computed once by `GrowthPrivacyObligation.DueAt`, and the list
// arrives ordered with the request nearest to running out of month at the top. This page renders
// both; it derives neither. What is left to `utils/growth/privacy-queue` is reading that answer —
// the open/resolved split, the countdown against the viewer's clock, and the two preconditions on a
// resolution. This page reads, renders and calls. That is the same division the send gate uses, for
// the same reason: a second opinion about a statutory obligation can drift from the first.
//
// NO GATE, AND THAT IS THE BACKEND'S SHAPE. `GrowthConsentAdminController` resolves StoreAdmin and
// nothing else: unlike `GrowthNewslettersController`, it has no `ModuleIsLiveAsync`, so these two
// routes answer with `growth.module` off. This page therefore reads no feature flag and offers no
// «turn the module on» hint, because there is no switch that darkens it — and a hint pointing at an
// unrelated lever would send an operator to move a switch that changes nothing here. It is also the
// right shape for the obligation: art. 12 does not stop applying because a venue turned marketing off.
//
// WHAT IT DELIBERATELY DOES NOT SHOW. Not the guest's address — the list carries only a masked
// `contactPointId` and this page never asks for more. Not the art. 15 export either: that document is
// built and mailed SERVER-SIDE by `ExecuteAccessAsync` and never persisted, so there is no artifact
// for a screen to display and displaying a reconstruction would be showing an operator a document
// that is not the one the guest received. And not «the address was deleted»: a fulfilled erasure may
// have been deferred (`GrowthErasureShred.ShredOrDeferAsync`) and this list has no field that tells
// the two apart.
export default {
  name: 'AdminGrowthPrivacy',
  components: { AdminPage },
  data () {
    return {
      // The raw wire body. `null` means the read has not answered — NOT that the queue is empty.
      list: null,
      // Re-read on every render pass that matters rather than held as a ticking clock: the deadline
      // moves once a day, and a page that recomputed on a timer would redraw a legal date under an
      // operator mid-click for no gain. Set at each read.
      readAt: new Date(),
      // Per-request refusal reason, keyed by request id. The operator's intent for the next write,
      // never something the server said — so it is held apart from the rows.
      reasons: {},
      // The request whose irreversible fulfilment is being confirmed, or null.
      confirming: null,
      busy: false,
      blocker: '',
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
    intlLocale () {
      return LOCALES[this.locale] || LOCALES.no;
    },
    _growthService () {
      return new GrowthService(this._coreInitializer);
    },
    queue () {
      return readQueue(this.list, this.readAt);
    },
    queueUnknown () {
      return this.queue.state === QUEUE_UNKNOWN;
    },
    TYPE_ERASURE () {
      return TYPE_ERASURE;
    }
  },
  watch: {
    // The queue is store-scoped by the ROUTE, so a store change makes every row on screen belong to
    // a store the operator is no longer looking at. Re-read rather than re-filter: this page holds no
    // rows the request did not ask for.
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
      this.blocker = '';
      this.confirming = null;
      // Cleared to unknown, not to empty.
      this.list = null;
      try {
        const body = await this._growthService.ListPrivacyRequests(this.storeId);
        this.list = body || null;
        this.readAt = new Date();
        this.seedReasons();
      } catch (error) {
        // 403/404 is the store-level answer — the API deliberately gives the same 404 for a store
        // that does not exist and one the caller does not administer, so the page says both at once
        // rather than picking the flattering reading.
        if (isGrowthApiError(error) && (error.status === 403 || error.status === 404)) {
          this.blocker = this.$i('gp_forbidden');
        }
        this.list = null;
      }
    },

    /**
     * Seeds one reason slot per open request, in ONE assignment.
     *
     * Vue 2 does not make a property added to an existing object reactive, so a reason typed against
     * a key this object did not already carry would be held and never re-rendered — which would show
     * a refuse button that stays disabled while the operator watches themselves type into it.
     */
    seedReasons () {
      const reasons = {};
      this.queue.open.forEach((row) => { reasons[row.requestId] = this.reasons[row.requestId] || ''; });
      this.reasons = reasons;
    },

    hasReason (row) {
      return !!String(this.reasons[row.requestId] || '').trim();
    },

    fulfil (row) {
      return this.resolve(row, { outcome: OUTCOME_FULFILLED, reason: null }, 'gp_toast_fulfilled');
    },

    reject (row) {
      return this.resolve(row, {
        outcome: OUTCOME_REJECTED,
        reason: String(this.reasons[row.requestId] || '').trim()
      }, 'gp_toast_rejected');
    },

    /**
     * The one write on this page.
     *
     * The precondition is re-asserted HERE and not only in a button's `disabled`, because a disabled
     * attribute is a rendering and this call destroys an address. `resolveRefusal` answers with the
     * server's own code, so a locally-caught refusal and a wire refusal render the same sentence.
     */
    async resolve (row, resolution, toastKey) {
      const refusal = resolveRefusal(resolution);
      if (refusal) {
        this.notify(this.$i(ERROR_KEYS[refusal] || 'gp_error_generic'), 'error');
        return;
      }
      if (this.busy) { return; }
      this.busy = true;
      try {
        await this._growthService.ResolvePrivacyRequest(this.storeId, row.requestId, resolution);
        this.confirming = null;
        // Re-read rather than patching the row in place: the resolution's own response is one
        // request, and a fulfilled erasure may also have changed nothing else visible — but the
        // authoritative queue is the list, and adopting a single row would leave the counts,
        // the ordering and the overdue banner derived from a body the server no longer holds.
        await this.init();
        this.notify(this.$i(toastKey, { reference: row.requestId }));
      } catch (error) {
        this.notify(this.messageFor(error), 'error');
      } finally {
        this.busy = false;
      }
    },

    // Keys on the stable `growth.*` code, never on the server's prose — which is English, may be
    // reworded, and is documented as not the thing a client should pin.
    messageFor (error) {
      if (!isGrowthApiError(error)) { return this.$i('gp_error_generic'); }
      return this.$i(ERROR_KEYS[error.code] || 'gp_error_generic');
    },

    typeLabel (row) {
      if (row.type === TYPE_ACCESS) { return this.$i('gp_type_access'); }
      if (row.type === TYPE_ERASURE) { return this.$i('gp_type_erasure'); }
      return this.$i('gp_type_unknown');
    },

    stateLabel (row) {
      return this.$i(STATE_KEYS[row.state] || 'gp_state_unknown');
    },

    toneFor (row) {
      if (row.isOverdue) { return 'overdue'; }
      if (row.state === 'Fulfilled') { return 'done'; }
      if (row.state === 'RejectedWithReason') { return 'refused'; }
      if (row.isOpen) { return 'open'; }
      return 'unknown';
    },

    /**
     * The countdown, in whole days, against the VIEWER's clock — never the deadline itself.
     *
     * A row the response carried no `dueAt` for says so instead of printing a number. There is no
     * fallback to count from: an invented date on this screen would be indistinguishable from the
     * real one, and the real one is the one the guest was promised.
     */
    clockLabel (row) {
      if (row.daysLeft === null) { return this.$i('gp_due_unknown'); }
      if (row.isOverdue) {
        // Three sentences, not one with a number in it. A deadline that ran out four hours ago is
        // `daysLeft: 0` — «the deadline ran out 0 days ago» is not a sentence, and «yesterday» would
        // be false. Each of the three says the true thing about its own case.
        const over = Math.abs(row.daysLeft);
        if (over === 0) { return this.$i('gp_overdue_today'); }
        return over === 1 ? this.$i('gp_overdue_by_one') : this.$i('gp_overdue_by', { days: over });
      }
      if (row.daysLeft === 0) { return this.$i('gp_due_today'); }
      return row.daysLeft === 1 ? this.$i('gp_days_left_one') : this.$i('gp_days_left', { days: row.daysLeft });
    },

    /** Null is not a fourth notice state — it gets its own sentence. See the DTO's own comment. */
    noticeLabel (row) {
      return this.$i(NOTICE_KEYS[row.noticeDelivery] || 'gp_notice_none');
    },

    stamp (value) {
      if (!value) { return '—'; }
      return new Intl.DateTimeFormat(this.intlLocale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(value);
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    }
  }
};
</script>

<style scoped>
.gp-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.gp-page__header { margin-bottom: 18px; }
.gp-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.gp-page__intro { color: #64748b; margin: 0; max-width: 70ch; line-height: 1.5; }

.gp-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.gp-page__toast--success { background: #159f63; }
.gp-page__toast--error { background: #ef4444; }
.gp-toast-enter-active, .gp-toast-leave-active { transition: opacity 0.25s ease; }
.gp-toast-enter, .gp-toast-leave-to { opacity: 0; }

.gp-page__blocker { padding: 18px 20px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }
.gp-page__controls { display: flex; justify-content: flex-end; margin-bottom: 12px; }

.gp-page__note { padding: 10px 16px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; margin: 0 0 10px; font-size: 0.86rem; line-height: 1.5; }
.gp-page__note--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.gp-page__overdue { padding: 12px 16px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; margin: 0 0 10px; font-weight: 600; font-size: 0.9rem; }

.gp-section { margin-top: 24px; }
.gp-section__title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 10px; }
.gp-empty { padding: 16px; border-radius: 12px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #94a3b8; margin: 0; font-size: 0.88rem; }

.gp-row { padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.gp-row.is-overdue { border-color: #fecaca; }
.gp-row--done { background: #fafbfc; box-shadow: none; }
.gp-row__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.gp-row__naming { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.gp-row__type { font-weight: 600; color: #292c34; }
.gp-row__ref { font-size: 0.78rem; color: #94a3b8; }
.gp-row__badge { padding: 4px 12px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.02em; }
.gp-row__badge--open { background: #f1f5f9; color: #64748b; }
.gp-row__badge--overdue { background: #fee2e2; color: #b91c1c; }
.gp-row__badge--done { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.gp-row__badge--refused { background: #fef3c7; color: #92400e; }
.gp-row__badge--unknown { background: #f8f9fa; color: #94a3b8; border: 1px dashed #cbd5e0; }

.gp-row__facts { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; }
.gp-row__fact { color: #94a3b8; font-size: 0.78rem; }
.gp-row__clock { margin: 8px 0 0; font-size: 0.84rem; color: #64748b; font-weight: 600; }
.gp-row__clock.is-overdue { color: #b91c1c; }
.gp-row__notice { margin: 6px 0 0; font-size: 0.8rem; color: #94a3b8; line-height: 1.5; }
.gp-row__warn { margin: 10px 0 0; padding: 10px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 0.84rem; line-height: 1.5; }
.gp-row__hint { margin: 8px 0 0; font-size: 0.78rem; color: #94a3b8; }

.gp-row__reason { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
.gp-row__reason-label { font-size: 0.74rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.gp-row__reason input { padding: 9px 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.gp-row__reason input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }

.gp-row__actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.gp-btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.gp-btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.gp-btn--danger { background: #ef4444; color: #fff; }
.gp-btn--plain { background: #fff; color: #64748b; border: 1px solid #e2e8f0; }
.gp-btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }
</style>
