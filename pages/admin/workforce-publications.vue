<template>
  <AdminPage @login-success="init">
    <div class="wfp-page">
      <div class="wfp-page__header">
        <h1 class="wfp-page__title">
          {{ $i('wfp_page_title') }}
        </h1>
        <p class="wfp-page__intro">
          {{ $i('wfp_page_intro') }}
        </p>
      </div>

      <div v-if="contextError" class="wfp-page__blocker" data-testid="wfp-blocker">
        {{ contextError }}
      </div>

      <!-- The history read is a `WorkforceScheduler` call. Saying so beats firing a request that can
           only fail and then reporting the refusal as if the store had never published. -->
      <section v-else-if="!canSchedule" class="wfp-page__refusal" data-testid="wfp-refusal">
        <h2 class="wfp-page__refusal-title">
          {{ $i('wfp_page_title') }}
        </h2>
        <p>{{ $i('wfp_no_capability') }}</p>
      </section>

      <template v-else>
        <WorkforcePublicationList
          :history="history"
          :selected-id="selectedId"
          :loading="loadingHistory"
          @select="select"
          @reload="loadHistory"
        />

        <!-- TWO GRANTS, NOT ONE. The backend gates the history on `WorkforceScheduler` and the
             recipient roster on `WorkforceManager`, so a scheduler can legitimately see that a week
             was published and still not be allowed to see who it named. That is shown as a stated
             refusal beside the list rather than as an empty roster, which would read as a
             publication that reached nobody. -->
        <section v-if="!canManage" class="wfp-page__refusal" data-testid="wfp-manager-only">
          <h2 class="wfp-page__refusal-title">
            {{ $i('wf_pub_rec_title') }}
          </h2>
          <p>{{ $i('wfp_manager_only') }}</p>
        </section>

        <WorkforcePublicationRecipients
          v-else
          :publication="selectedPublication"
          :summary="recipientSummary"
          :loading="loadingRecipients"
        />

        <p class="wfp-page__links">
          <nuxt-link data-testid="wfp-delivery-link" to="/admin/workforce-delivery">
            {{ $i('wfp_delivery_link') }}
          </nuxt-link>
          <nuxt-link data-testid="wfp-schedule-link" to="/admin/workforce-schedule">
            {{ $i('wfp_back_to_schedule') }}
          </nuxt-link>
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforcePublicationList from '~/components/admin/workforce/WorkforcePublicationList.vue';
import WorkforcePublicationRecipients from '~/components/admin/workforce/WorkforcePublicationRecipients.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { callerHas, CAPABILITY_MANAGER, CAPABILITY_SCHEDULER } from '~/utils/workforce/roster';
import {
  listPublications,
  summariseRecipients,
  RECEIPTS_UNKNOWN
} from '~/utils/workforce/publication-receipts';

/**
 * CAN THIS VENUE SHOW THAT IT TOLD THE PEOPLE ON THE PLAN?
 *
 * The publish button answers with a recipient COUNT, and `/admin/workforce-delivery` shows what
 * became of the outbox commands behind it. Neither answers the question a venue is actually asked,
 * because a transport accepting a message is not a person having received it. The worker's own
 * acknowledgement was already written and receipted on the worker's screen; until this page existed
 * there was no manager-facing read of it anywhere, in any surface — the two endpoints that hold the
 * answer were reachable only with a bearer token and curl.
 *
 * The page holds NO judgement of its own: `~/utils/workforce/publication-receipts` decides which of
 * the four attestations each recipient is in and which publications have been replaced, and this
 * renders the answer. The one thing it must never do is merge the attestations — see that module's
 * header.
 */
export default {
  components: { AdminPage, WorkforcePublicationList, WorkforcePublicationRecipients },
  data () {
    return {
      contextError: '',
      capabilities: [],
      // null is UNKNOWN, never emptiness. A history read that has not answered, or that failed, must
      // not spend a frame claiming this store has never published.
      publications: null,
      recipients: null,
      selectedId: null,
      loadingHistory: false,
      loadingRecipients: false
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    _scheduleService () {
      return new WorkforceScheduleService(this._coreInitializer);
    },
    canSchedule () {
      return callerHas(this.capabilities, CAPABILITY_SCHEDULER);
    },
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    history () {
      return listPublications(this.publications === null ? RECEIPTS_UNKNOWN : this.publications);
    },
    selectedPublication () {
      if (!this.selectedId) { return null; }
      return this.history.rows.find(r => r.id === this.selectedId) || null;
    },
    recipientSummary () {
      // The denominator comes from the HISTORY row, not from the roster itself, so the two reads can
      // disagree out loud. See `summariseRecipients`.
      const addressed = this.selectedPublication ? this.selectedPublication.addressed : null;
      return summariseRecipients(this.recipients === null ? RECEIPTS_UNKNOWN : this.recipients, addressed);
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
      this.publications = null;
      this.recipients = null;
      this.selectedId = null;

      try {
        const context = await this._scheduleService.GetContext(this.storeId);
        this.capabilities = (context && context.capabilities) || [];
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wfp_no_capability')
          : this.$i('wfp_context_failed');
        return;
      }

      if (!this.canSchedule) { return; }
      await this.loadHistory();
    },

    async loadHistory () {
      if (!this.canSchedule || !this.storeId) { return; }
      this.loadingHistory = true;
      // Back to UNKNOWN while in flight, so a refresh that fails cannot leave the previous answer on
      // screen as though it were current.
      this.publications = null;
      try {
        const answered = await this._scheduleService.GetPublicationHistory(this.storeId);
        this.publications = Array.isArray(answered) ? answered : [];
      } catch (e) {
        // Left null: the list renders its `unknown` state, which says the history could not be read.
        // It deliberately does NOT fall through to "this store has never published".
        this.publications = null;
      } finally {
        this.loadingHistory = false;
      }

      // A selection that survived a reload but no longer exists in the answer is dropped, so the
      // roster can never be left describing a publication this read did not return.
      if (this.selectedId && !this.history.rows.some(r => r.id === this.selectedId)) {
        this.selectedId = null;
        this.recipients = null;
      }
    },

    async select (publicationId) {
      this.selectedId = publicationId;
      this.recipients = null;
      if (!this.canManage || !publicationId || !this.storeId) { return; }

      this.loadingRecipients = true;
      try {
        const answered = await this._scheduleService.GetRecipients(this.storeId, publicationId);
        this.recipients = Array.isArray(answered) ? answered : [];
      } catch (e) {
        // Left null: the panel says the roster could not be read, never that nobody was addressed.
        this.recipients = null;
      } finally {
        this.loadingRecipients = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.wfp-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }

  &__header { margin-bottom: 8px; }

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

  &__links {
    margin-top: 24px;
    font-size: 0.9em;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;

    a { color: #1bb776; text-decoration: none; }
    a:hover { text-decoration: underline; }
  }
}
</style>
