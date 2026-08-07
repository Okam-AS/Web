<template>
  <AdminPage @login-success="init">
    <div class="wft-page">
      <div class="wft-page__header">
        <h1 class="wft-page__title">
          {{ $i('wft_page_title') }}
        </h1>
        <p class="wft-page__intro">
          {{ $i('wft_page_intro') }}
        </p>
      </div>

      <div v-if="contextError" class="wft-page__blocker" data-testid="wft-blocker">
        {{ contextError }}
      </div>

      <!-- Every timesheet route resolves `WorkforcePayrollApprover`, including the three reads: a
           timesheet line IS the wage record, and there is nothing left to partially withhold. Saying
           so beats firing five requests that can only 403. -->
      <section v-else-if="!canApprovePayroll" class="wft-page__refusal" data-testid="wft-refusal">
        <h2 class="wft-page__refusal-title">
          {{ $i('wft_page_title') }}
        </h2>
        <p>{{ $i('wft_no_payroll_capability') }}</p>
      </section>

      <template v-else>
        <!-- ---- the period a manager is asking about ------------------------------------------- -->
        <div class="wft-page__controls">
          <div class="wft-page__field">
            <label class="wft-page__label" for="wft-from">{{ $i('wft_from') }}</label>
            <input
              id="wft-from"
              v-model="fromBusinessDate"
              class="wft-page__input"
              type="date"
              data-testid="wft-from"
            >
          </div>
          <div class="wft-page__field">
            <label class="wft-page__label" for="wft-to">{{ $i('wft_to') }}</label>
            <input
              id="wft-to"
              v-model="toBusinessDate"
              class="wft-page__input"
              type="date"
              data-testid="wft-to"
            >
          </div>
          <button
            class="wft-page__load"
            type="button"
            :disabled="loading"
            data-testid="wft-load"
            @click="load"
          >
            {{ loading ? $i('wft_loading') : $i('wft_load') }}
          </button>
        </div>

        <!-- The stage switch, reported by the server rather than guessed at. The two writes are
             gated on it; the three reads are not.
             `=== false` and not `!exportEnabled`: the computed is three-state, and an UNREAD flag
             must not raise this banner. It is the same rule the withheld-reason beside the button
             now follows — the two disagreeing about it is exactly what shipped. -->
        <p
          v-if="exportEnabled === false"
          class="wft-page__flag-off"
          data-testid="wft-flag-off"
        >
          {{ $i('wft_flag_off_notice') }}
        </p>

        <!-- A refusal the server actually sent, keyed on its CODE. Never on the prose. -->
        <div v-if="refusal" class="wft-page__refusal-note" data-testid="wft-refusal-note">
          <strong>{{ $i('wft_refused') }}</strong>
          <span data-testid="wft-refusal-text">{{ refusal.text }}</span>
          <code v-if="refusal.code" data-testid="wft-refusal-code">{{ refusal.code }}</code>
        </div>

        <div v-if="notice" class="wft-page__notice" data-testid="wft-notice">
          {{ notice }}
        </div>

        <WorkforceTimesheetPanel
          :period="period"
          :export-enabled="exportEnabled"
          :has-payroll-capability="canApprovePayroll"
          :loading="loading"
          :busy="busy"
          @approve="approve"
          @export="createExport"
        />

        <WorkforceTimesheetBatchList
          :batches="batches"
          :downloading="downloading"
          @download="download"
        />

        <p class="wft-page__back">
          <nuxt-link to="/admin/workforce-rates">
            {{ $i('wft_back_to_rates') }}
          </nuxt-link>
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceTimesheetPanel from '~/components/admin/workforce/WorkforceTimesheetPanel.vue';
import WorkforceTimesheetBatchList from '~/components/admin/workforce/WorkforceTimesheetBatchList.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { WorkforceTimesheetService } from '~/utils/workforce/timesheet-client';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { callerHas, CAPABILITY_PAYROLL } from '~/utils/workforce/roster';
import { periodFor, refusalKeyFor } from '~/utils/workforce/timesheet';

/**
 * THE TIMESHEET BATCH'S DOOR.
 *
 * The W5 endpoints — approve a period, send it through an export provider, fetch back the exact
 * bytes that were sent — were reachable over HTTP and from no browser. The export provider seam, the
 * neutral CSV and the finalize-then-refuse chain were all real and all unreachable by the person they
 * are for. This page is the door.
 *
 * ---- WHY THE WRITES LIVE HERE AND NOT IN THE PANEL -------------------------------------------
 *
 * Approve is the act that turns hours into money somebody must later explain: the server stamps the
 * approving staff member into `WorkforceTimesheetPeriod.ApprovedByActorReference`, digests the frozen
 * rows, and the row becomes immutable — a database trigger refuses to change it afterwards. The
 * ACTOR reaches that write from the bearer token this app already holds and from nowhere else: the
 * client attaches it, the server resolves the caller's staff member from it and REFUSES rather than
 * defaulting when it cannot. Nothing on this page names an actor, and nothing may: a page that could
 * choose one would be a page that could attribute a payroll freeze to somebody who did not do it.
 *
 * ---- THE RE-READ AFTER EVERY WRITE, WHICH IS NOT BELT AND BRACES ------------------------------
 *
 * The approve response builds its detail inline and never populates `batches`. Adopting it whole
 * would show a freshly approved period as having no batches even after one had been sent. So each
 * write is followed by `GetTimesheet`, which is the only read that answers with them.
 *
 * ---- WHAT A SECOND CLICK MEANS ----------------------------------------------------------------
 *
 * Nothing here debounces the two write buttons into a no-op, and that is deliberate. Each click
 * mints a fresh `Idempotency-Key`, so a second Approve is a genuine second attempt and earns the
 * server's `timesheet-period-already-approved` refusal — which is the finalize-then-refuse chain
 * doing its job in front of the manager. Swallowing it in the client would hide the one behaviour
 * this surface exists to demonstrate.
 */
export default {
  components: { AdminPage, WorkforceTimesheetPanel, WorkforceTimesheetBatchList },
  data () {
    const today = new Date();
    const iso = at => at.toISOString().slice(0, 10);
    const yesterday = new Date(today.getTime() - 86400000);
    const fortnightStart = new Date(yesterday.getTime() - 13 * 86400000);

    return {
      contextError: '',
      capabilities: [],
      // The last completed fortnight ending YESTERDAY — a period whose days are all closed. A default
      // that included today would offer a manager a period still being worked.
      fromBusinessDate: iso(fortnightStart),
      toBusinessDate: iso(yesterday),
      // null is UNKNOWN throughout: a read that has not answered must not claim this store has
      // nothing to approve and nothing sent.
      listResult: null,
      detail: null,
      loading: false,
      busy: '',
      downloading: '',
      refusal: null,
      notice: ''
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    _timesheets () {
      return new WorkforceTimesheetService(this._coreInitializer);
    },
    _schedule () {
      return new WorkforceScheduleService(this._coreInitializer);
    },
    canApprovePayroll () {
      return callerHas(this.capabilities, CAPABILITY_PAYROLL);
    },
    /**
     * The server's own answer about the stage flag, never this app's guess — and `null` when there
     * IS no answer yet, which is not the same as an answer of "off".
     *
     * This used to be `!!(listResult && listResult.exportEnabled)`. The `!!` turned an unread flag
     * into a read one that said "off", and the withheld-reason beside Approve then told a manager
     * the store's export switch was off when nothing had ever asked. See `flagState` in
     * `~/utils/workforce/timesheet`.
     */
    exportEnabled () {
      if (!this.listResult) { return null; }
      return !!this.listResult.exportEnabled;
    },
    /**
     * The period being acted on. The DETAIL read wins when it has answered, because it is the only
     * one carrying the batches; the list's summary is what is available before that.
     */
    period () {
      if (this.detail && this.detail.period && this.detail.period.fromBusinessDate) {
        return this.detail.period;
      }
      return periodFor(this.listResult, this.fromBusinessDate, this.toBusinessDate);
    },
    batches () {
      return this.detail ? (this.detail.batches || []) : null;
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.contextError = '';
      this.capabilities = [];

      try {
        const context = await this._schedule.GetContext(this.storeId);
        this.capabilities = (context && context.capabilities) || [];
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wft_no_payroll_capability')
          : this.$i('wft_context_failed');
        return;
      }

      if (!this.canApprovePayroll) { return; }
      await this.load();
    },

    async load () {
      if (!this.canApprovePayroll || !this.storeId) { return; }
      this.loading = true;
      this.refusal = null;
      this.notice = '';
      // Back to UNKNOWN while in flight, so a reload that fails cannot leave the previous period on
      // screen under a fresh range.
      this.listResult = null;
      this.detail = null;

      try {
        this.listResult = await this._timesheets.ListTimesheets(
          this.storeId, this.fromBusinessDate, this.toBusinessDate);
        const summary = periodFor(this.listResult, this.fromBusinessDate, this.toBusinessDate);
        if (summary) { await this.readDetail(summary.timesheetPeriodId); }
      } catch (e) {
        this.showRefusal(e, 'wft_load_failed');
      } finally {
        this.loading = false;
      }
    },

    /**
     * The only read that answers with the period's batches — see this file's header. Kept separate
     * so every write path can re-read through exactly one place.
     */
    async readDetail (periodId) {
      try {
        this.detail = await this._timesheets.GetTimesheet(this.storeId, periodId);
      } catch (e) {
        // Left null: the batch list renders its UNKNOWN state rather than claiming nothing was sent.
        this.detail = null;
      }
    },

    async approve (options) {
      const target = this.period;
      if (!target || this.busy) { return; }
      this.busy = 'approve';
      this.refusal = null;
      this.notice = '';

      try {
        await this._timesheets.ApproveTimesheet(this.storeId, target.timesheetPeriodId, {
          fromBusinessDate: this.fromBusinessDate,
          toBusinessDate: this.toBusinessDate,
          allowIncomplete: !!(options && options.allowIncomplete)
        });
        this.notice = this.$i('wft_approved_notice');
        // Re-read BOTH: the list carries the stage flag and the period's derived status, the detail
        // carries the batches.
        await this.refresh(target.timesheetPeriodId);
      } catch (e) {
        this.showRefusal(e, 'wft_approve_failed');
        // A refusal changes what the server holds often enough that the screen must re-read rather
        // than keep rendering the state it guessed at — `already-approved` is exactly the case where
        // the period on screen is stale and the refusal is the proof.
        await this.refresh(target.timesheetPeriodId);
      } finally {
        this.busy = '';
      }
    },

    async createExport () {
      const target = this.period;
      if (!target || this.busy) { return; }
      this.busy = 'export';
      this.refusal = null;
      this.notice = '';

      try {
        const batch = await this._timesheets.CreateTimesheetExport(
          this.storeId, target.timesheetPeriodId, {});
        this.notice = this.$i('wft_exported_notice', { file: (batch && batch.fileName) || '' });
        await this.refresh(target.timesheetPeriodId);
      } catch (e) {
        this.showRefusal(e, 'wft_export_failed');
        await this.refresh(target.timesheetPeriodId);
      } finally {
        this.busy = '';
      }
    },

    /**
     * THE DOWNLOAD. Fetches the exact bytes the batch sent and hands them to the browser as a file.
     *
     * A Blob and an object URL rather than pointing an anchor at the route directly: the route is
     * `[Authorize]` and a plain navigation carries no bearer token, so a direct link would answer
     * 401 and look like a broken button. This is the same reason every other authenticated export in
     * this app fetches first.
     */
    async download (batch) {
      if (!batch || this.downloading) { return; }
      this.downloading = batch.batchId;
      this.refusal = null;

      try {
        const file = await this._timesheets.DownloadTimesheetExport(
          this.storeId, this.period.timesheetPeriodId, batch.batchId);

        const name = file.fileName || batch.fileName || 'timesheet.csv';
        const blob = new Blob([file.text], { type: batch.contentType || 'text/csv;charset=utf-8' });
        const href = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(href);

        this.notice = this.$i('wft_downloaded_notice', { file: name });
      } catch (e) {
        this.showRefusal(e, 'wft_download_failed');
      } finally {
        this.downloading = '';
      }
    },

    async refresh (periodId) {
      try {
        this.listResult = await this._timesheets.ListTimesheets(
          this.storeId, this.fromBusinessDate, this.toBusinessDate);
      } catch (e) {
        this.listResult = null;
      }
      await this.readDetail(periodId);
    },

    /**
     * A refusal the server sent, rendered from its CODE.
     *
     * A code this surface has no sentence for is NOT swallowed into "something went wrong": the
     * generic sentence is shown WITH the code, so a refusal a future backend adds arrives on screen
     * readable rather than disappearing. `detail` is deliberately not printed as the primary text —
     * it is prose and may be localised or reworded — but the code is, because that is the stable
     * thing a person can quote.
     */
    showRefusal (error, fallbackKey) {
      if (isWorkforceApiError(error)) {
        const key = refusalKeyFor(error.code);
        this.refusal = {
          code: error.code || null,
          text: key ? this.$i(key) : this.$i('wft_refusal_unknown')
        };
        return;
      }
      this.refusal = { code: null, text: this.$i(fallbackKey) };
    }
  }
};
</script>

<style lang="scss" scoped>
.wft-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }

  &__header { margin-bottom: 24px; }

  &__title {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;

    @media (max-width: 768px) { font-size: 1.5em; }
  }

  &__intro {
    color: #64748b;
    margin: 0;
    font-size: 0.95em;
  }

  &__blocker,
  &__refusal {
    margin-top: 24px;
    padding: 24px;
    background: #f8f9fa;
    border: 1px dashed #cbd5e0;
    border-radius: 12px;
    color: #64748b;
  }

  &__refusal-title {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &__field { flex: 1 1 180px; }

  &__label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  &__input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;

    &:hover { border-color: #cbd5e0; }

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }

  &__load {
    background: white;
    color: #292c34;
    border: 2px solid #e2e8f0;
    padding: 14px 24px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #cbd5e0;
      transform: translateY(-1px);
    }

    &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  }

  &__flag-off {
    margin: 16px 0 0 0;
    padding: 16px;
    background: #fef3c7;
    border-radius: 8px;
    color: #92400e;
    font-size: 0.9em;
  }

  &__refusal-note {
    margin: 16px 0 0 0;
    padding: 16px;
    background: #fee2e2;
    border-radius: 8px;
    color: #991b1b;
    font-size: 0.9em;

    strong { margin-right: 8px; }
    code {
      display: block;
      margin-top: 8px;
      font-size: 0.85em;
      color: #7f1d1d;
      overflow-wrap: anywhere;
    }
  }

  &__notice {
    margin: 16px 0 0 0;
    padding: 16px;
    background: #d1fae5;
    border-radius: 8px;
    color: #065f46;
    font-size: 0.9em;
  }

  &__back {
    margin-top: 24px;
    font-size: 0.9em;

    a { color: #1bb776; text-decoration: none; }
    a:hover { text-decoration: underline; }
  }
}
</style>
