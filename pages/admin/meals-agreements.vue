<template>
  <AdminPage full-width @login-success="load">
    <div class="meals-page">
      <div class="meals-page__header">
        <h1 class="meals-page__title">
          {{ $i('meals_page_title') }}
        </h1>
        <p class="meals-page__intro">
          {{ $i('meals_page_intro') }}
        </p>
      </div>

      <div class="meals-page__controls">
        <button class="meals-page__btn" :disabled="loading" @click="load">
          {{ $i('meals_reload') }}
        </button>
      </div>

      <MealsAgreementList :agreements="view.agreements" @select="select" />

      <!-- Orders attributed to a company the directory did not list. The backend's directory
           projection skips an agreement whose company row is missing, so this is reachable — and it
           means money at this venue is attributed to an account the venue cannot see. Surfaced
           rather than swallowed; it is the kind of thing a proving surface exists to expose. -->
      <p v-if="view.orders.unlistedCompanyIds.length" class="meals-page__notice meals-page__notice--warn">
        {{ unlistedNotice }}
      </p>

      <MealsFundedOrders
        :orders="view.orders"
        :selected="view.selected"
        :locale="locale"
        :currency="currency"
      />

      <p class="meals-page__footnote">
        {{ $i('meals_footnote_no_totals') }}
      </p>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MealsAgreementList from '~/components/admin/meals/MealsAgreementList.vue';
import MealsFundedOrders from '~/components/admin/meals/MealsFundedOrders.vue';
import { MealsStoreService, refusalOf } from '~/utils/meals/meals-client';
import { buildStoreView } from '~/utils/meals/store-view';

/**
 * THE VENUE'S COMPANY MEALS SURFACE — one journey, end to end: an agreement, and a funded order.
 *
 * WHAT THIS IS NOT. It is not the Meals module's admin experience. Meals has 23 endpoints; this
 * page binds two. The other twenty-one are unreachable from a venue's admin today, and the reason
 * is worth writing down rather than rediscovering:
 *
 *   • The COMPANY-scoped surface (the company account, memberships, invitations, programs, policy
 *     versions, program membership) and the STATEMENT surface (draft/finalize/list/get/export) gate
 *     on `IMealsFeatureGate`, which reads the `Features:Meals` configuration section through
 *     `IOptionsMonitor<MealsFeatureSettings>`. Nothing in `Program.cs` ever calls
 *     `Configure<MealsFeatureSettings>`, so that section is never bound and `CurrentValue` is a
 *     default-constructed instance with every flag false. Those endpoints answer an opaque 404 in
 *     every deployment, whatever the config file says. (Sven's open-decision list carries this.)
 *   • The STORE-scoped reads this page binds gate on `IMealsStoreFeatureFlags`, which consults the
 *     shared per-store feature-flag override FIRST and falls back to that same unbound config gate.
 *     `meals.module` is in the published flag catalog, so a row set through the platform's own
 *     per-store flag endpoint turns this venue's Meals surface on. That is why exactly these two
 *     reads are reachable and the rest are not.
 *   • The one store-scoped MUTATION — resolving a reconciliation exception — is the odd one out: the
 *     queue read gates per-store but `ResolveAsync` calls `RequireVisible()`, which is the config
 *     gate. It is readable and not resolvable. No button here pretends otherwise.
 *
 * THE READS ARE INDEPENDENT AND FAIL INDEPENDENTLY. Neither `catch` is allowed to become the
 * other's answer: an orders read that fails leaves the orders UNKNOWN, and the agreements that were
 * successfully read stay on screen saying exactly what they said.
 *
 * NO PERIOD FILTER, DELIBERATELY. The obvious next control on a page like this is "this month".
 * There is a known, unresolved month-boundary defect in the Meals period math (the same family as
 * Margin's) and the ruling on it is Sven's, so this surface takes no dependency on it: it groups by
 * company, never by period, and derives no month from any instant it shows. See the timestamp note
 * in `MealsFundedOrders.vue` for the other half — Meals exposes no store timezone at all.
 */
export default {
  name: 'AdminMealsAgreements',
  components: { AdminPage, MealsAgreementList, MealsFundedOrders },
  data () {
    return {
      loading: false,
      // Null is UNKNOWN, and stays null on failure. It is never initialised to `[]`/`{orders: []}`,
      // because those are answers and this is the absence of one.
      directory: null,
      directoryRefusal: null,
      orders: null,
      ordersRefusal: null,
      selectedCompanyId: null
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
    // The market is the single source for currency (`marketConfig`), and it is what `priceLabel`
    // already formats in. Passed down so the orders table can tell a figure it CAN print in that
    // currency from one the agreement priced in another — it refuses the symbol rather than
    // relabel the money.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _mealsStoreService () {
      return new MealsStoreService(this._coreInitializer);
    },
    view () {
      return buildStoreView({
        directory: this.directory,
        directoryRefusal: this.directoryRefusal,
        orders: this.orders,
        ordersRefusal: this.ordersRefusal,
        selectedCompanyId: this.selectedCompanyId
      });
    },
    unlistedNotice () {
      const count = this.view.orders.unlistedCompanyIds.length;
      return count === 1
        ? this.$i('meals_unlisted_company_one')
        : this.$i('meals_unlisted_company', { count });
    }
  },
  watch: {
    storeId () { this.load(); }
  },
  mounted () {
    this.load();
  },
  methods: {
    async load () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.loading = true;

      // Cleared to UNKNOWN, not to empty. A reload in flight must not render as a venue that has
      // suddenly stopped having agreements.
      this.directory = null;
      this.directoryRefusal = null;
      this.orders = null;
      this.ordersRefusal = null;

      const [directory, orders] = await Promise.all([
        this._mealsStoreService.ListCompanies(this.storeId)
          .catch((e) => { this.directoryRefusal = refusalOf(e); return null; }),
        this._mealsStoreService.ListOrders(this.storeId)
          .catch((e) => { this.ordersRefusal = refusalOf(e); return null; })
      ]);

      this.directory = directory;
      this.orders = orders;

      // Keep the selection only if it is still an agreement this store has; otherwise the orders
      // panel would be headed by a company that is no longer on the list.
      if (this.selectedCompanyId && !this.view.selected) { this.selectedCompanyId = null; }
      this.loading = false;
    },

    select (companyId) {
      // Clicking the selected row clears it, so a venue can get back to "nothing selected" without
      // reloading — that state is the page's own instruction, not an error.
      this.selectedCompanyId = this.selectedCompanyId === companyId ? null : companyId;
    }
  }
};
</script>

<style lang="scss" scoped>
.meals-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.meals-page__header {
  margin-bottom: 24px;
}

.meals-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.meals-page__intro {
  color: #64748b;
  margin: 0;
}

.meals-page__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.meals-page__btn {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.meals-page__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0 0 16px;
}

.meals-page__notice--warn {
  background: #fff8e6;
  color: #92400e;
}

.meals-page__footnote {
  margin: 16px 0 0;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}
</style>
