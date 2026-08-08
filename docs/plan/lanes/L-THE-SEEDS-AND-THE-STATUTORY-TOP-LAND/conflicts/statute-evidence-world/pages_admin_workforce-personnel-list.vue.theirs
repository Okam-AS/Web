<template>
  <AdminPage full-width @login-success="init">
    <div class="wfpl-page">
      <div class="wfpl-page__header">
        <h1 class="wfpl-page__title">
          {{ $i('wfpl_page_title') }}
        </h1>
        <p class="wfpl-page__intro">
          {{ $i('wfpl_page_intro') }}
        </p>
      </div>

      <transition name="wfpl-toast">
        <div v-if="toast.show" class="wfpl-page__toast" :class="'wfpl-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wfpl-page__blocker">
        {{ contextError }}
      </div>

      <!-- The register is a `WorkforceManager` read and nothing else admits a caller to it: a
           PowerUser or a store admin without the grant is answered 403 by the service. Saying so is
           the alternative to firing a request that can only fail and reporting it as a failure. -->
      <section v-else-if="!canManage" class="wfpl-page__refusal">
        <h2 class="wfpl-page__refusal-title">
          {{ $i('wfpl_page_title') }}
        </h2>
        <p>{{ $i('wfpl_no_capability') }}</p>
      </section>

      <template v-else>
        <div class="wfpl-page__controls">
          <div class="wfpl-page__field">
            <label class="wfpl-page__label" for="wfpl-date">{{ $i('wfpl_date_label') }}</label>
            <input
              id="wfpl-date"
              class="wfpl-page__date"
              type="date"
              :value="selectedDate"
              :disabled="loading"
              @change="pickDate($event.target.value)"
            >
          </div>

          <div class="wfpl-page__daynav">
            <button class="wfpl-page__btn" :disabled="loading || !steppableDate" @click="stepDay(-1)">
              {{ $i('wfpl_day_prev') }}
            </button>
            <button class="wfpl-page__btn" :disabled="loading" @click="goToVenueToday">
              {{ $i('wfpl_day_today') }}
            </button>
            <button class="wfpl-page__btn" :disabled="loading || !steppableDate" @click="stepDay(1)">
              {{ $i('wfpl_day_next') }}
            </button>
          </div>

          <div class="wfpl-page__actions">
            <button class="wfpl-page__btn" :disabled="loading" @click="load">
              {{ $i('wfpl_reload') }}
            </button>
            <!-- The statutory print path. § 8-5-6 requires the list to be producible on paper
                 immediately, so this is a first-class control rather than a hint to use the browser
                 menu — and it is disabled while the sheet holds nothing to print, because a button
                 that prints an empty page is worse than no button. -->
            <button class="wfpl-page__btn wfpl-page__btn--print" :disabled="!canPrint" @click="printSheet">
              {{ $i('wfpl_print') }}
            </button>
          </div>
        </div>

        <p v-if="loading" class="wfpl-page__loading">
          {{ $i('wfpl_loading') }}
        </p>

        <WorkforcePersonnelListSheet :sheet="sheet" />
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforcePersonnelListSheet from '~/components/admin/workforce/WorkforcePersonnelListSheet.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import { WorkforcePersonnelListService } from '~/utils/workforce/personnel-list-client';
import { CAPABILITY_MANAGER, callerHas } from '~/utils/workforce/roster';
import { SHEET_UNKNOWN, buildPersonnelSheet } from '~/utils/workforce/personnel-list';

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86400000;

// ---- THE PRINT-HOST CLASS, AND WHY IT IS DECLARED RATHER THAN ADDED ---------------------------
//
// The print rules in this file's unscoped `<style>` reach `.admin__content`, which belongs to the
// admin SHELL and is therefore outside anything a scoped selector can address. They are guarded by a
// class on `document.body` that exists only while this page is showing.
//
// `document.body.classList.add(...)` in `mounted` is the obvious way to put it there, and it DOES NOT
// WORK. vue-meta owns `body.class`, because `layouts/default.vue` declares
// `bodyAttrs: { class: this.isCh ? 'okam-ch' : '' }`, and vue-meta writes that attribute WHOLESALE on
// every head update. An imperatively added class is gone by the next one — and on a non-CH market it
// is gone to the empty string. Measured in a browser on 2026-08-01: after the login redirect the body
// carried `class=""` while this file's stylesheet sat in the document matching nothing.
//
// NOTHING LOOKED BROKEN. The page rendered perfectly. What came out of the printer was a statutory
// register with the organisation number, the time zone, the correction lineage and the hired-in
// organisation number all cut off the right edge of the paper, behind a leading blank sheet — because
// the rule that takes the shell's content padding off (`.admin__content { padding: 0 }`) never
// applied, so the sheet was laid out wider than the page box it was painted into. Every one of those
// four is a field § 8-5-6 names. The only way to see it was to print it.
//
// Declaring it through `head()` puts the class where vue-meta already is: Nuxt merges a page's
// `bodyAttrs` over the layout's while the page is mounted and restores the layout's value when it
// leaves — which is also what makes the teardown in `beforeDestroy` unnecessary rather than merely
// moved. The market class is carried through BY HAND, because overriding `class` replaces the
// layout's value rather than adding to it, and dropping `okam-ch` would restyle the whole Swiss site.
const PRINT_HOST_CLASS = 'wfpl-print-host';

// The statutory personalliste — `bokføringsforskriften § 8-5-6`.
//
// WHY THIS PAGE EXISTS. The regulation requires a venue to keep a personnel list AVAILABLE AT THE
// WORKPLACE showing who is present with arrival and departure times, the business name and
// organisation number, and an identity code per person — and to be able to produce it on paper
// immediately. The backend has recorded all of that since the clock lane shipped. Until this page
// there was no route, no client method and no control anywhere in the admin web that read it, so an
// inspector standing in the venue could be shown nothing at all.
//
// WHAT IT DELIBERATELY DOES NOT OFFER. There is no editing. The whole personalliste family is
// append-only and retention-locked on the backend: an entry is corrected by a superseding entry
// carrying the correction actor and time, and no manager-facing endpoint on the API writes one. A
// screen that offered a correction control here could only ever fail, so it shows the correction
// lineage the register already carries and nothing more.
//
// THE DATE IS THE VENUE'S, AND THE SERVER OWNS IT. The picker starts empty and the first read sends
// NO `businessDate` at all, which makes the server resolve the venue's today in the store's own
// zone; the response echoes the day it settled on and that echo populates the picker. Nothing on
// this page is derived from the browser's clock — not the default day, not "today", and not the
// distinction between someone on site now and a departure that was never recorded.
export default {
  name: 'AdminWorkforcePersonnelList',
  components: { AdminPage, WorkforcePersonnelListSheet },
  data () {
    return {
      contextError: '',
      timeZoneId: null,
      capabilities: [],

      // '' means "the venue's today, as the SERVER resolves it" — deliberately not a client-computed
      // date. It is replaced by the server's echo as soon as a read answers.
      selectedDate: '',
      // null is UNKNOWN, never emptiness: a read that has not answered, or failed, must not spend a
      // frame claiming nobody was at work.
      response: null,
      loading: false,

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
    _rosterService () {
      return new WorkforceRosterService(this._coreInitializer);
    },
    _personnelService () {
      return new WorkforcePersonnelListService(this._coreInitializer);
    },
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    sheet () {
      return buildPersonnelSheet(this.response, { contextTimeZoneId: this.timeZoneId });
    },
    /**
     * The day the arrows step from — the SERVER's echoed business date, falling back to what is in
     * the picker. Absent before the first answer, and then the arrows are disabled: stepping from a
     * day nobody has established would ask for a date the page invented.
     */
    steppableDate () {
      return this.sheet.businessDate || (LOCAL_DATE.test(this.selectedDate) ? this.selectedDate : null);
    },
    /** Nothing is offered for printing until there is a register to print. */
    canPrint () {
      return !this.loading && this.sheet.state !== SHEET_UNKNOWN;
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
      this.contextError = '';
      this.timeZoneId = null;
      this.capabilities = [];
      this.selectedDate = '';
      this.response = null;

      try {
        const context = await this._rosterService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
        if (!this.timeZoneId) {
          // Every time on this sheet is the venue's wall clock. Without the store's zone the page
          // would be printing the viewer's clock onto a statutory register, so it prints nothing.
          this.contextError = this.$i('wfpl_context_failed');
          return;
        }
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wfpl_no_capability')
          : this.$i('wfpl_context_failed');
        return;
      }

      await this.load();
    },

    async load () {
      if (!this.canManage || !this.storeId) { return; }
      this.loading = true;
      // Cleared to UNKNOWN while in flight. Leaving the previous day's rows on screen under a new
      // date would print one day's people under another day's heading.
      this.response = null;

      const asked = this.selectedDate;
      try {
        const response = await this._personnelService.GetPersonnelList(
          this.storeId, LOCAL_DATE.test(asked) ? asked : null);
        // A date moved while the read was in flight must not adopt the previous day's answer.
        if (this.selectedDate !== asked) { return; }
        this.response = response;
        // The server is authoritative about which day it answered for, including the day it picked
        // when none was asked for. The picker follows it rather than the other way round.
        const answered = this.sheet.businessDate;
        if (answered) { this.selectedDate = answered; }
      } catch (e) {
        if (this.selectedDate !== asked) { return; }
        this.response = null;
        this.notifyError(e, 'wfpl_read_failed');
      } finally {
        this.loading = false;
      }
    },

    /**
     * A date typed or picked by the manager. Refused rather than coerced when it is not a calendar
     * date: the wire takes `yyyy-MM-dd` and nothing else, and a browser that hands back a partial
     * value must not become a request for some other day.
     */
    pickDate (value) {
      if (!LOCAL_DATE.test(value || '')) {
        this.notify(this.$i('wfpl_date_invalid'), 'error');
        return;
      }
      this.selectedDate = value;
      return this.load();
    },

    stepDay (delta) {
      const base = this.steppableDate;
      if (!base) { return; }
      const moved = new Date(Date.UTC(
        Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1, Number(base.slice(8, 10))) + delta * MS_PER_DAY);
      const pad = n => String(n).padStart(2, '0');
      this.selectedDate = moved.getUTCFullYear() + '-' + pad(moved.getUTCMonth() + 1) + '-' + pad(moved.getUTCDate());
      return this.load();
    },

    /** "Today" is a question for the server: clear the date and let it resolve the venue's own day. */
    goToVenueToday () {
      this.selectedDate = '';
      return this.load();
    },

    /**
     * The paper copy. § 8-5-6: the list "skal kunne skrives ut på papir".
     *
     * `window.print()` is what actually produces it; the stylesheet below is what makes the output a
     * register rather than a screenshot of an admin panel. A browser that exposes no print command
     * is told about plainly instead of the button silently doing nothing — a control that appears to
     * work and does not is the failure this whole page exists to avoid.
     */
    printSheet () {
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        this.notify(this.$i('wfpl_print_unavailable'), 'error');
        return;
      }
      window.print();
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },

    /** The server's own wording when it typed one; this page's fallback when it did not. */
    notifyError (e, fallbackKey) {
      const detail = isWorkforceApiError(e) && e.message ? e.message : this.$i(fallbackKey);
      this.notify(detail, 'error');
    }
  },

  /**
   * The print chrome. See this component's unscoped `<style>` block: those rules are inert without
   * this class, so the stylesheet cannot reach a page that is not this one — and see the comment on
   * `PRINT_HOST_CLASS` for why it is DECLARED here rather than added to `document.body` in `mounted`.
   */
  head () {
    return {
      bodyAttrs: {
        class: [this.isCh ? 'okam-ch' : '', PRINT_HOST_CLASS].filter(Boolean).join(' ')
      }
    };
  }
};
</script>

<style scoped>
.wfpl-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.wfpl-page__header { margin-bottom: 18px; }
.wfpl-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfpl-page__intro { color: #64748b; margin: 0; }

.wfpl-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.wfpl-page__toast--success { background: #1bb776; }
.wfpl-page__toast--error { background: #ef4444; }

.wfpl-page__blocker { background: #fffbeb; color: #92400e; border-radius: 12px; padding: 20px; }
.wfpl-page__refusal { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; color: #92400e; }
.wfpl-page__refusal-title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 8px; }

.wfpl-page__controls { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
.wfpl-page__field { display: flex; flex-direction: column; gap: 6px; }
.wfpl-page__label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #292c34; }
.wfpl-page__date { padding: 9px 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; color: #292c34; }
.wfpl-page__daynav, .wfpl-page__actions { display: flex; gap: 8px; }
.wfpl-page__actions { margin-left: auto; }
.wfpl-page__btn { background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 9px 14px; font-size: 0.85rem; color: #292c34; cursor: pointer; }
.wfpl-page__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wfpl-page__btn--print { border-color: #1bb776; color: #159f63; font-weight: 600; }

.wfpl-page__loading { font-size: 0.85rem; color: #64748b; margin: 0 0 12px; }

/* THE PAGE HALF OF THE PRINT PATH: everything that is not the register comes off the paper, and the
   sheet gets the full width of it. The sheet's own print rules (the component) do the rest. */
@media print {
  .wfpl-page { max-width: none; margin: 0; padding: 0; }
  .wfpl-page__header,
  .wfpl-page__controls,
  .wfpl-page__toast,
  .wfpl-page__loading { display: none !important; }
}
</style>

<style>
/* UNSCOPED, and every rule is guarded by the `wfpl-print-host` class this page declares on
   `document.body` through `head()` while it is showing — see `PRINT_HOST_CLASS` above for why it is
   declared and not added. A page's unscoped stylesheet outlives the page in a Nuxt build — the
   chunk's CSS is not unloaded on navigation — so an unguarded `@media print` rule here would quietly
   restyle the printing of every other admin screen.
   It exists because the admin shell wraps this page: the sidebar hides itself when printing and
   AdminPage.vue now gives back the gutter and the mobile top-bar strip it left behind, but the
   shell's content padding and the onboarding banner are still there, and neither belongs on a
   statutory register. */

/* A NAMED page box, claimed by `.wfpl-sheet` in the sheet component's own print rules.
   Named rather than a bare `@page`, which carries no selector and therefore cannot be scoped or
   guarded at all: a bare one would put a 14 mm margin on `/admin/brev`'s letter printing for the rest
   of the session, since that page's CSS and this page's CSS coexist once both have been visited.
   A browser that does not support named pages ignores both halves and prints the sheet at its own
   default margins — readable, just not exactly 14 mm. */
@page wfpl-sheet {
  size: A4 portrait;
  margin: 14mm;
}

@media print {
  /* The shell's 32/40 px content padding. On A4 portrait it is what pushed the sheet wider than the
     14 mm page box above, which the browser resolves by CLIPPING — taking the organisation number,
     the time zone and the correction lineage off the right edge of the register. */
  body.wfpl-print-host .admin__content { padding: 0 !important; max-width: none !important; }
  body.wfpl-print-host .admin__main { display: block !important; }
  body.wfpl-print-host .onboarding-notification { display: none !important; }
}
</style>
