<template>
  <AdminPage @login-success="init">
    <div class="wfd-page">
      <div class="wfd-page__header">
        <h1 class="wfd-page__title">
          {{ $i('wfd_page_title') }}
        </h1>
        <p class="wfd-page__intro">
          {{ $i('wfd_page_intro') }}
        </p>
      </div>

      <div v-if="contextError" class="wfd-page__blocker" data-testid="wfd-blocker">
        {{ contextError }}
      </div>

      <!-- The failures read is a `WorkforceManager` call and nothing else admits a caller: the
           service answers a store admin without the grant with a 403. Saying so beats firing a
           request that can only fail and then reporting the failure as a delivery problem. -->
      <section v-else-if="!canManage" class="wfd-page__refusal" data-testid="wfd-refusal">
        <h2 class="wfd-page__refusal-title">
          {{ $i('wfd_page_title') }}
        </h2>
        <p>{{ $i('wfd_no_capability') }}</p>
      </section>

      <template v-else>
        <WorkforceDeliveryPanel :summary="summary" :loading="loading" @reload="load" />

        <p class="wfd-page__back">
          <nuxt-link to="/admin/workforce-schedule">
            {{ $i('wfd_back_to_schedule') }}
          </nuxt-link>
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceDeliveryPanel from '~/components/admin/workforce/WorkforceDeliveryPanel.vue';
import { contextRefusalKey } from '~/utils/workforce/context-refusal';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { callerHas, CAPABILITY_MANAGER } from '~/utils/workforce/roster';
import { summarise, DELIVERY_UNKNOWN } from '~/utils/workforce/delivery-failures';

/**
 * WHAT A PUBLICATION ACTUALLY REACHED.
 *
 * The publish button answers with a recipient COUNT, which is how many outbox rows were enqueued —
 * not how many arrived. Until this page existed the difference was readable only with a bearer token
 * and curl, so a schedule that reached nobody and a schedule that reached everybody looked identical
 * from the manager's chair. That is the same silence the outbox was built to end, one layer up.
 *
 * The page holds NO judgement of its own: `~/utils/workforce/delivery-failures` decides which tier a
 * row belongs to and this renders the answer. The one thing it must never do is merge the tiers —
 * see that module's header.
 */
export default {
  components: { AdminPage, WorkforceDeliveryPanel },
  data () {
    return {
      contextError: '',
      capabilities: [],
      // null is UNKNOWN, never emptiness. A read that has not answered, or that failed, must not
      // spend a single frame claiming this store has nothing undelivered — that is precisely the
      // false all-clear this surface exists to stop.
      rows: null,
      roster: null,
      loading: false
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
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    summary () {
      return summarise(this.rows === null ? DELIVERY_UNKNOWN : this.rows, this.roster);
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
      this.rows = null;

      try {
        const context = await this._scheduleService.GetContext(this.storeId);
        this.capabilities = (context && context.capabilities) || [];
      } catch (e) {
        this.contextError = this.$i(contextRefusalKey(e, {
          noCapability: 'wfd_no_capability',
          failed: 'wfd_context_failed'
        }));
        return;
      }

      if (!this.canManage) { return; }

      // The roster only puts NAMES on the rows; the failures read stands alone without it. A roster
      // that fails leaves `roster` null and every row says "an unnamed recipient" — which is worse
      // to read and still true, where dropping the whole page would hide a real dead letter behind
      // an unrelated failure.
      this.roster = await this._scheduleService.ListStaff(this.storeId)
        .then(list => (Array.isArray(list) ? list : null))
        .catch(() => null);

      await this.load();
    },

    async load () {
      if (!this.canManage || !this.storeId) { return; }
      this.loading = true;
      // Back to UNKNOWN while in flight, so a refresh that fails cannot leave the previous answer on
      // screen under a fresh timestamp.
      this.rows = null;
      try {
        const answered = await this._scheduleService.GetNotificationFailures(this.storeId);
        this.rows = Array.isArray(answered) ? answered : [];
      } catch (e) {
        // Left as null: the panel renders its `unknown` state, which says the report could not be
        // read. It deliberately does NOT fall through to the "nothing outstanding" state.
        this.rows = null;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.wfd-page {
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

  &__back {
    margin-top: 24px;
    font-size: 0.9em;

    a { color: #1bb776; text-decoration: none; }
    a:hover { text-decoration: underline; }
  }
}
</style>
