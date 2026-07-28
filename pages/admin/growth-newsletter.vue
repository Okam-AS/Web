<template>
  <AdminPage full-width @login-success="init">
    <div class="growth-page">
      <div class="growth-page__header">
        <h1 class="growth-page__title">
          {{ $i('growth_page_title') }}
        </h1>
        <p class="growth-page__intro">
          {{ $i('growth_page_intro') }}
        </p>
      </div>

      <transition name="growth-toast">
        <div v-if="toast.show" class="growth-page__toast" :class="'growth-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="blocker" class="growth-page__blocker">
        {{ blocker }}
      </div>

      <template v-else>
        <div class="growth-page__grid">
          <!-- 1. What capture produced. Read-only, and never an audience. -->
          <GrowthConsentStanding :standing="standing" />

          <!-- 2. The immutable audience. The only lawful recipient count on this page. -->
          <GrowthAudiencePanel
            :audience="audience"
            :busy="busy.audience"
            :locale="intlLocale"
            @compute="computeAudience"
          />
        </div>

        <!-- 3. The newsletter itself. -->
        <section class="growth-page__panel">
          <header class="growth-page__panel-head">
            <div>
              <h2 class="growth-page__panel-title">
                {{ $i('growth_draft_title') }}
              </h2>
              <p class="growth-page__panel-intro">
                {{ $i('growth_draft_intro') }}
              </p>
            </div>
            <select
              v-if="newsletters.length"
              class="growth-page__select"
              :value="selectedId || ''"
              :disabled="busy.any"
              @change="selectNewsletter($event.target.value)"
            >
              <option value="">
                {{ $i('growth_draft_new') }}
              </option>
              <option v-for="item in newsletters" :key="item.id" :value="item.id">
                #{{ item.id }} · {{ item.state }} · v{{ item.currentVersionNo }}
              </option>
            </select>
          </header>

          <!-- A draft cannot exist without an audience to bind to: the backend requires a snapshot
               id at creation, so the form is not offered before one has been computed. -->
          <p v-if="!canAuthor" class="growth-page__hint">
            {{ $i('growth_draft_needs_audience') }}
          </p>

          <template v-else>
            <label class="growth-page__field">
              <span>{{ $i('growth_draft_subject') }}</span>
              <input v-model="form.subject" type="text" :disabled="busy.any">
            </label>
            <label class="growth-page__field">
              <span>{{ $i('growth_draft_content') }}</span>
              <textarea v-model="form.contentJson" rows="6" :disabled="busy.any" />
            </label>
            <label class="growth-page__field">
              <span>{{ $i('growth_draft_plain') }}</span>
              <textarea v-model="form.plainTextAlternative" rows="3" :disabled="busy.any" />
            </label>

            <div class="growth-page__actions">
              <button
                type="button"
                class="growth-page__btn growth-page__btn--primary"
                :disabled="busy.any || !form.subject || !form.contentJson"
                @click="saveDraft"
              >
                {{ selectedId ? $i('growth_draft_save') : $i('growth_draft_create') }}
              </button>
              <span v-if="detail" class="growth-page__version">
                {{ $i('growth_draft_version', { version: detail.currentVersion.versionNo }) }}
              </span>
            </div>
          </template>
        </section>

        <template v-if="detail">
          <!-- 4. Test send — to the operator's own address, through the provider test route. -->
          <section class="growth-page__panel">
            <h2 class="growth-page__panel-title">
              {{ $i('growth_test_title') }}
            </h2>
            <p class="growth-page__panel-intro">
              {{ $i('growth_test_intro') }}
            </p>
            <div class="growth-page__actions">
              <input
                v-model="testAddress"
                type="email"
                class="growth-page__input"
                :placeholder="$i('growth_test_address')"
                :disabled="busy.any"
              >
              <button
                type="button"
                class="growth-page__btn"
                :disabled="busy.any || !testAddress"
                @click="sendTest"
              >
                {{ busy.test ? $i('growth_test_sending') : $i('growth_test_send') }}
              </button>
            </div>
          </section>

          <!-- 5. The human approval binding. -->
          <section class="growth-page__panel">
            <header class="growth-page__panel-head">
              <div>
                <h2 class="growth-page__panel-title">
                  {{ $i('growth_approval_title') }}
                </h2>
                <p class="growth-page__panel-intro">
                  {{ $i('growth_approval_intro') }}
                </p>
              </div>
              <span class="growth-page__badge" :class="'growth-page__badge--' + approval.state">
                {{ $i('growth_approval_state_' + approval.state) }}
              </span>
            </header>
            <div class="growth-page__actions">
              <button
                type="button"
                class="growth-page__btn"
                :disabled="busy.any || approvalIsLive"
                @click="approve"
              >
                {{ busy.approve ? $i('growth_approval_approving') : $i('growth_approval_approve') }}
              </button>
              <span v-if="approval.approvedAt" class="growth-page__version">
                {{ $i('growth_approval_approved_at', { time: stamp(approval.approvedAt) }) }}
              </span>
            </div>
          </section>

          <!-- 6. The gate, and the only send button on this page. -->
          <GrowthSendGate :gate="gate" :busy="busy.dispatch" @send="dispatch" />

          <!-- 7. The run, once one exists. -->
          <GrowthRunOutcome v-if="run.state !== 'unknown'" :run="run" :locale="intlLocale" />
        </template>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import GrowthConsentStanding from '~/components/admin/growth/GrowthConsentStanding.vue';
import GrowthAudiencePanel from '~/components/admin/growth/GrowthAudiencePanel.vue';
import GrowthSendGate from '~/components/admin/growth/GrowthSendGate.vue';
import GrowthRunOutcome from '~/components/admin/growth/GrowthRunOutcome.vue';
import { GrowthService, NEWSLETTER_SUBSCRIBERS } from '~/utils/growth/growth-client';
import { isGrowthApiError } from '~/utils/growth/api-client';
import {
  readConsentStanding, readAudience, readApproval, readRun, resolveSendGate,
  APPROVAL_LIVE, UNKNOWN
} from '~/utils/growth/send-gate';
import { UNSUBSCRIBE_MECHANISM } from '~/utils/growth/platform-capability';

// The admin locale is a bare language tag; `Intl` wants a BCP-47 one.
const LOCALES = { no: 'nb-NO', en: 'en-GB', de: 'de-DE' };

// The stable `growth.*` codes this surface can explain, mapped to their copy. Every one is a code
// a route reachable from this page actually throws (`GrowthApiException` factories in
// `Services/Growth/GrowthApiException.cs` plus the newsletter/dispatch call sites). A code not
// listed here falls to the generic message rather than rendering a missing key.
const ERROR_KEYS = {
  'growth.not_found': 'growth_error_not_found',
  'growth.no_live_approval': 'growth_error_no_live_approval',
  'growth.approval_stale': 'growth_error_approval_stale',
  'growth.stale_version': 'growth_error_stale_version',
  'growth.unattributed': 'growth_error_unattributed',
  'growth.newsletter_not_editable': 'growth_error_newsletter_not_editable',
  'growth.newsletter_not_approvable': 'growth_error_newsletter_not_approvable',
  'growth.subject_required': 'growth_error_subject_required',
  'growth.content_required': 'growth_error_content_required',
  'growth.test_address_required': 'growth_error_test_address_required'
};

// The Growth admin proving surface: capture to a lawful send, on one screen.
//
// The journey it exercises, in the order the page draws it:
//   1. consent standing (#8)     — what capture produced, as counts. Never an audience.
//   2. audience snapshot (#10/#11) — the immutable membership a dispatch will actually read.
//   3. draft + edit (#12/#13/#14/#15) — immutable versions; an edit invalidates approval.
//   4. test send (#16)            — to the operator's own address only.
//   5. approval (#17)             — pins version + content hash + snapshot.
//   6. dispatch (#18)             — refused unless the gate is ready.
//   7. the run                    — truthful, separately-reported counts.
//
// EVERY REFUSAL LIVES IN `utils/growth/send-gate`, not here. This page reads, renders and calls; it
// makes no decision about whether a send is lawful, so there is no second opinion to drift from the
// first. The send button binds to the gate's state and to nothing else.
export default {
  name: 'AdminGrowthNewsletter',
  components: { AdminPage, GrowthConsentStanding, GrowthAudiencePanel, GrowthSendGate, GrowthRunOutcome },
  data () {
    return {
      // Raw wire bodies. `null` means the read has not answered — NOT that the thing is empty. The
      // readers in `send-gate` turn that null into an explicit unknown state rather than into zeros.
      summary: null,
      snapshot: null,
      detail: null,
      newsletters: [],
      selectedId: null,
      form: { subject: '', contentJson: '', plainTextAlternative: '' },
      testAddress: '',
      busy: { audience: false, draft: false, test: false, approve: false, dispatch: false, any: false },
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
    standing () {
      return readConsentStanding(this.summary);
    },
    /**
     * The audience the SEND will read.
     *
     * Once a newsletter is open, that is its BOUND snapshot — not whatever was last computed on
     * screen. Showing the freshly computed one beside a draft bound to an older one would put a
     * recipient count next to a send that will not use it.
     */
    audience () {
      if (this.detail && this.detail.boundSnapshot) {
        return readAudience(this.detail.boundSnapshot);
      }
      return readAudience(this.snapshot);
    },
    approval () {
      return readApproval(this.detail);
    },
    approvalIsLive () {
      return this.approval.state === APPROVAL_LIVE;
    },
    run () {
      return readRun(this.detail && this.detail.run);
    },
    // A content hash exists only when the server holds content for the current version, so it is
    // server-vouched rather than a guess from the form's own fields.
    hasContent () {
      return !!(this.detail && this.detail.currentVersion && this.detail.currentVersion.contentHash);
    },
    gate () {
      return resolveSendGate({
        standing: this.standing,
        audience: this.audience,
        approval: this.approval,
        run: this.run,
        unsubscribeMechanism: UNSUBSCRIBE_MECHANISM,
        hasContent: this.hasContent
      });
    },
    // Authoring needs a snapshot id to bind to; the backend requires one at creation.
    canAuthor () {
      return this.audience.state !== UNKNOWN && !!this.audience.snapshotId;
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    // An already-signed-in admin lands here with a session in hand, so the page reads immediately;
    // `AdminPage`'s `@login-success` covers the case where the session arrives after mount. `init`
    // guards on both conditions, so the two paths cannot double-read against a half-ready store.
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.blocker = '';
      // Cleared to unknown, not to empty: a failed or in-flight read must not render as a store
      // with no consents and no newsletters.
      this.summary = null;
      this.snapshot = null;
      this.detail = null;
      this.selectedId = null;
      this.newsletters = [];

      // Each read fails independently. A consent read that fails leaves the standing UNKNOWN — which
      // the gate treats as a refusal to send — rather than failing the whole page.
      const [summary, list] = await Promise.all([
        this._growthService.GetConsentSummary(this.storeId).catch(e => this.recordRead(e)),
        this._growthService.ListNewsletters(this.storeId).catch(e => this.recordRead(e))
      ]);
      this.summary = summary || null;
      this.newsletters = (list && list.items) || [];
    },

    // A 403/404 on the first read is the store-level answer and blocks the page; anything else
    // leaves the individual read unknown so the gate can refuse on it.
    recordRead (error) {
      if (isGrowthApiError(error) && (error.status === 403 || error.status === 404)) {
        this.blocker = this.$i('growth_error_forbidden');
      }
      return null;
    },

    async computeAudience () {
      await this.run_('audience', async () => {
        this.snapshot = await this._growthService.ComputeSnapshot(this.storeId, NEWSLETTER_SUBSCRIBERS);
        this.notify(this.$i('growth_audience_computed'));
      });
    },

    async selectNewsletter (value) {
      const id = value ? Number(value) : null;
      this.selectedId = id;
      if (!id) {
        this.detail = null;
        this.form = { subject: '', contentJson: '', plainTextAlternative: '' };
        return;
      }
      await this.run_('draft', async () => {
        this.detail = await this._growthService.GetNewsletter(this.storeId, id);
        // The detail carries the subject but not the body — the body is only ever sent, never read
        // back — so the editor shows what the server vouches for and leaves the rest blank rather
        // than inventing it.
        this.form.subject = this.detail.currentVersion.subject || '';
      });
    },

    async saveDraft () {
      await this.run_('draft', async () => {
        if (this.selectedId) {
          this.detail = await this._growthService.EditDraft(this.storeId, this.selectedId, {
            // The optimistic-concurrency guard: a stale base is a 409, never a silent overwrite.
            baseVersionNo: this.detail.currentVersion.versionNo,
            subject: this.form.subject,
            contentJson: this.form.contentJson,
            plainTextAlternative: this.form.plainTextAlternative,
            segmentSnapshotId: this.audience.snapshotId
          });
        } else {
          this.detail = await this._growthService.CreateDraft(this.storeId, {
            subject: this.form.subject,
            contentJson: this.form.contentJson,
            plainTextAlternative: this.form.plainTextAlternative,
            segmentSnapshotId: this.audience.snapshotId
          });
          this.selectedId = this.detail.id;
        }
        await this.refreshList();
        this.notify(this.$i('growth_draft_saved'));
      });
    },

    async sendTest () {
      await this.run_('test', async () => {
        const result = await this._growthService.TestSend(this.storeId, this.selectedId, this.testAddress);
        // The provider's SUBMISSION status, never a delivery state. Saying "delivered" here would be
        // the same misreport the run counters are built to avoid.
        this.notify(this.$i('growth_test_result', { status: result.status }));
      });
    },

    async approve () {
      await this.run_('approve', async () => {
        this.detail = await this._growthService.Approve(this.storeId, this.selectedId, {
          newsletterVersionId: this.detail.currentVersion.versionId,
          contentHash: this.detail.currentVersion.contentHash,
          segmentSnapshotId: this.detail.boundSnapshot.snapshotId
        }).then(() => this._growthService.GetNewsletter(this.storeId, this.selectedId));
        this.notify(this.$i('growth_approval_done'));
      });
    },

    async dispatch () {
      // The gate is re-asserted here, not merely in the button's `disabled`. A disabled attribute is
      // a rendering, and this method is the only caller of the send route.
      if (this.gate.state !== 'ready') { return; }
      await this.run_('dispatch', async () => {
        await this._growthService.Dispatch(this.storeId, this.selectedId);
        this.detail = await this._growthService.GetNewsletter(this.storeId, this.selectedId);
        await this.refreshList();
        this.notify(this.$i('growth_gate_dispatched_toast'));
      });
    },

    async refreshList () {
      const list = await this._growthService.ListNewsletters(this.storeId).catch(() => null);
      this.newsletters = (list && list.items) || this.newsletters;
    },

    // One place where an action's busy flag, its error handling and its toast live, so no action can
    // forget to clear the flag or swallow a typed refusal.
    async run_ (key, action) {
      this.busy[key] = true;
      this.busy.any = true;
      try {
        await action();
      } catch (error) {
        this.notifyError(this.messageFor(error));
      } finally {
        this.busy[key] = false;
        this.busy.any = false;
      }
    },

    // Rendering keys on the stable `growth.*` code, never on the server's prose — which is English,
    // may be reworded, and is explicitly documented as not the thing a client should pin.
    //
    // The map is explicit rather than derived from the code string: it names exactly which refusals
    // this surface understands, so an unrecognised code falls to the generic message instead of
    // silently rendering a missing translation key at an operator.
    messageFor (error) {
      if (!isGrowthApiError(error)) { return this.$i('growth_error_generic'); }
      const key = ERROR_KEYS[error.code];
      return this.$i(key || 'growth_error_generic');
    },

    stamp (value) {
      if (!value) { return '—'; }
      return new Intl.DateTimeFormat(this.intlLocale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(value);
    },

    notify (message) { this.showToast(message, 'success'); },
    notifyError (message) { this.showToast(message, 'error'); },
    showToast (message, type) {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    }
  }
};
</script>

<style scoped>
.growth-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
.growth-page__header { margin-bottom: 20px; }
.growth-page__title { font-size: 22px; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.growth-page__intro { font-size: 14px; color: #64748b; margin: 0; max-width: 70ch; line-height: 1.5; }
.growth-page__blocker { border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; border-radius: 8px; padding: 16px; font-size: 14px; }
.growth-page__toast { position: fixed; top: 16px; right: 16px; z-index: 20; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #fff; }
.growth-page__toast--success { background: #1bb776; }
.growth-page__toast--error { background: #ef4444; }
.growth-toast-enter-active, .growth-toast-leave-active { transition: opacity 200ms; }
.growth-toast-enter, .growth-toast-leave-to { opacity: 0; }
.growth-page__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 16px; }
.growth-page__panel { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; margin-bottom: 16px; }
.growth-page__panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
.growth-page__panel-title { font-size: 16px; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.growth-page__panel-intro { font-size: 13px; color: #64748b; margin: 0; max-width: 60ch; line-height: 1.5; }
.growth-page__hint { font-size: 13px; color: #64748b; background: #f8f9fa; border: 1px dashed #cbd5e0; border-radius: 8px; padding: 12px; margin: 0; }
.growth-page__field { display: block; margin-bottom: 12px; }
.growth-page__field span { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
.growth-page__field input, .growth-page__field textarea { width: 100%; border: 1px solid #cbd5e0; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit; color: #292c34; }
.growth-page__input { border: 1px solid #cbd5e0; border-radius: 8px; padding: 8px 10px; font-size: 13px; min-width: 240px; }
.growth-page__select { border: 1px solid #cbd5e0; border-radius: 8px; padding: 8px 10px; font-size: 13px; background: #fff; }
.growth-page__actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.growth-page__btn { border: 1px solid #cbd5e0; border-radius: 8px; background: #fff; color: #292c34; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.growth-page__btn--primary { background: #292c34; border-color: #292c34; color: #fff; }
.growth-page__btn:disabled { color: #94a3b8; background: #f1f5f9; border-color: #e2e8f0; cursor: default; }
.growth-page__version { font-size: 12px; color: #64748b; }
.growth-page__badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }
.growth-page__badge--live { background: #1bb776; color: #fff; }
.growth-page__badge--none { background: #f1f5f9; color: #64748b; }
.growth-page__badge--superseded { background: #fde68a; color: #92400e; }
.growth-page__badge--unknown { background: #f1f5f9; color: #94a3b8; }
</style>
