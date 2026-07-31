<template>
  <AdminPage full-width @login-success="load">
    <div class="meals-setup">
      <div class="meals-setup__header">
        <h1 class="meals-setup__title">
          {{ $i('meals_setup_title') }}
        </h1>
        <p class="meals-setup__intro">
          {{ $i('meals_setup_intro') }}
        </p>
      </div>

      <div class="meals-setup__controls">
        <button class="mls-btn" :disabled="loading" @click="load">
          {{ $i('meals_reload') }}
        </button>
      </div>

      <!-- The ordering step nothing on this surface can perform, said once and at the top rather
           than discovered after a programme has been stood up. -->
      <p class="mls-note">
        {{ $i('meals_setup_no_ordering') }}
      </p>

      <MealsCompanyPicker :companies="view.companies" @select="select" />

      <MealsCompanyPanel
        ref="companyPanel"
        :can-concierge="isPowerUser"
        :self-user-id="selfUserId"
        :default-country-code="marketCountry"
        :selected-company-id="selectedCompanyId"
        :company="view.company"
        :busy="busy === 'createCompany' || busy === 'updateCompany'"
        :create-failure-key="failureKey('createCompany')"
        :create-failure-detail="failureDetail('createCompany')"
        :edit-failure-key="failureKey('updateCompany')"
        :edit-failure-detail="failureDetail('updateCompany')"
        @create-company="createCompany"
        @update-company="updateCompany"
      />

      <template v-if="selectedCompanyId">
        <MealsCorridorPanel
          :company-id="selectedCompanyId"
          :selected="view.selected"
          :can-concierge="isPowerUser"
          :currency="corridorCurrency"
          :busy="busy === 'signAgreement'"
          :failure-key="failureKey('signAgreement')"
          :failure-detail="failureDetail('signAgreement')"
          @sign-agreement="signAgreement"
        />

        <MealsProgramPanel
          ref="programPanel"
          :programs="view.programs"
          :selected="view.selected"
          :selected-program-id="selectedProgramId"
          :store-id="storeId"
          :default-time-zone="marketTimeZone"
          :currency="currency"
          :busy="busy === 'createProgram' || busy === 'createPolicy'"
          :program-failure-key="failureKey('createProgram')"
          :program-failure-detail="failureDetail('createProgram')"
          :policy-failure-key="failureKey('createPolicy')"
          :policy-failure-detail="failureDetail('createPolicy')"
          @select-program="selectProgram"
          @create-program="createProgram"
          @create-policy="createPolicy"
        />

        <MealsPeoplePanel
          ref="peoplePanel"
          :invitations="view.invitations"
          :members="view.members"
          :issued="issued"
          :locale="locale"
          :busy="busy === 'createInvitation' || busy === 'revokeInvitation'"
          :invite-failure-key="failureKey('createInvitation')"
          :invite-failure-detail="failureDetail('createInvitation')"
          :revoke-failure-key="failureKey('revokeInvitation')"
          :revoke-failure-detail="failureDetail('revokeInvitation')"
          @create-invitation="createInvitation"
          @revoke-invitation="revokeInvitation"
          @dismiss-issued="issued = null"
        />
      </template>

      <p v-else class="mls-note">
        {{ $i('meals_setup_pick_company') }}
      </p>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MealsCompanyPicker from '~/components/admin/meals/MealsCompanyPicker.vue';
import MealsCompanyPanel from '~/components/admin/meals/MealsCompanyPanel.vue';
import MealsCorridorPanel from '~/components/admin/meals/MealsCorridorPanel.vue';
import MealsProgramPanel from '~/components/admin/meals/MealsProgramPanel.vue';
import MealsPeoplePanel from '~/components/admin/meals/MealsPeoplePanel.vue';
import { MealsAdminService } from '~/utils/meals/admin-client';
import { MealsStoreService, refusalOf } from '~/utils/meals/meals-client';
import { buildAdminView } from '~/utils/meals/admin-view';
import { problemDetail, writeFailureKey, SCOPE_COMPANY, SCOPE_CONCIERGE, SCOPE_CORRIDOR } from '~/utils/meals/refusal-copy';
import { StoreMarketService } from '~/utils/store-market/market-client';

/**
 * SETTING A COMPANY MEALS PILOT UP — the write half of the module.
 *
 * WHY THIS IS A SECOND PAGE AND NOT MORE OF `/admin/meals-agreements`. Three reasons, and any one of
 * them would have been enough:
 *
 *   • DIFFERENT AUTHORITY. That page is StoreAdmin at the selected venue. Everything here is either
 *     the platform PowerUser role (create a company, sign a corridor) or an active `CompanyAdmin`
 *     MEMBERSHIP of one specific company (edit it, run its programmes, invite people) — an authority
 *     that is never inferred from StoreAdmin or PowerUser. Putting these forms on the venue page
 *     would show every restaurant manager a set of controls that 403 for all of them.
 *   • DIFFERENT GATE. The venue page's reads resolve `meals.module` per store; the company-scoped
 *     routes here resolve it from the module-wide `Features:Meals` config, with no store dimension.
 *     Either can be on while the other is off, so one page could not carry one honest "the module is
 *     off" sentence.
 *   • DIFFERENT QUESTION. That page monitors what has happened — agreements, funded orders. This one
 *     makes things exist. Its own header calls itself a proving surface for one journey, and its
 *     tests pin that it issues exactly two reads.
 *
 * WHAT THIS PAGE STILL CANNOT DO, and why no control pretends otherwise:
 *
 *   • NOTHING HERE SENDS AN INVITATION. The module has no outbox at all — see `MealsPeoplePanel`.
 *   • NOBODY ORDERS. The employee funding path (quotes, checkout) needs a reservation token no cart
 *     in this estate sends and a company-account payer no client offers, and it sits behind its own
 *     `meals.ordering` flag. Standing a programme up here does not make a lunch buyable, and the
 *     banner at the top says so rather than leaving it to be discovered.
 *   • THERE IS NO STATEMENT. Billing sits behind `meals.statements` and is a surface of its own.
 *
 * EVERY READ FAILS ON ITS OWN. Five reads run here — the venue directory plus four company-scoped
 * ones — and no `catch` is allowed to become another's answer: an invitations read that 403s leaves
 * the memberships exactly as they were read.
 */
export default {
  name: 'AdminMealsCompanies',
  components: {
    AdminPage,
    MealsCompanyPicker,
    MealsCompanyPanel,
    MealsCorridorPanel,
    MealsProgramPanel,
    MealsPeoplePanel
  },
  data () {
    return {
      loading: false,
      // Null is UNKNOWN and stays null on failure. Never initialised to `[]`, because an empty list
      // is an answer and this is the absence of one.
      directory: null,
      directoryRefusal: null,
      company: null,
      companyRefusal: null,
      programs: null,
      programsRefusal: null,
      invitations: null,
      invitationsRefusal: null,
      members: null,
      membersRefusal: null,
      market: null,

      selectedCompanyId: null,
      selectedProgramId: null,

      // Companies created in THIS browser session. They are not in the venue directory until a
      // corridor is signed for them, and the module has no route that lists company accounts, so
      // without this a company would disappear the instant it was created.
      sessionCompanies: [],

      // The last created invitation, including its plaintext token. Held only in memory and only
      // until the operator dismisses it — no route can produce it a second time.
      issued: null,

      busy: null,
      // Pre-declared so Vue 2 tracks every slot; a key added later would not be reactive.
      failures: {
        createCompany: null,
        updateCompany: null,
        signAgreement: null,
        createProgram: null,
        createPolicy: null,
        createInvitation: null,
        revokeInvitation: null
      }
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
    isPowerUser () {
      return !!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser);
    },
    /**
     * The signed-in account's own ApplicationUser id — the value a company membership is matched by
     * (`MealsMembership.ApplicationUserId` against the token's `unique_name`, which
     * `UserService.GenerateJwtTokenAsync` mints as `user.Id`). It is offered as the default first
     * company admin because naming anybody else creates an account this operator cannot then read.
     */
    selfUserId () {
      const user = this.$store.state.currentUser;
      return user && user.id ? String(user.id) : null;
    },
    /** The market's currency — the single source for money on this admin (`marketConfig`). */
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    /**
     * The currency a corridor signed at THIS venue is denominated in.
     *
     * It comes from the store's own market rather than from `marketConfig`, which is the edition
     * this browser is running: a corridor is a fact about the venue, and under the market-authority
     * law `Store.CurrencyCode` derives from the store's country. Null when the market read did not
     * answer — and then the panel withholds signing rather than guessing.
     */
    corridorCurrency () {
      return (this.market && this.market.currencyCode) || null;
    },
    marketCountry () {
      return (this.market && this.market.country) || null;
    },
    /**
     * The zone the store's business dates resolve in, offered as the policy window's zone.
     *
     * `timeZone` is what the venue CHOSE; when it has chosen none the market read reports the
     * platform fallback it is actually using, and that is still the honest suggestion — the policy
     * panel is a free-text field over IANA suggestions and the server is the only thing that can say
     * whether a zone loads.
     */
    marketTimeZone () {
      return (this.market && this.market.timeZone) || null;
    },
    _mealsStoreService () {
      return new MealsStoreService(this._coreInitializer);
    },
    _mealsAdminService () {
      return new MealsAdminService(this._coreInitializer);
    },
    _storeMarketService () {
      return new StoreMarketService(this._coreInitializer);
    },
    view () {
      return buildAdminView({
        directory: this.directory,
        directoryRefusal: this.directoryRefusal,
        sessionCompanies: this.sessionCompanies,
        company: this.company,
        companyRefusal: this.companyRefusal,
        programs: this.programs,
        programsRefusal: this.programsRefusal,
        invitations: this.invitations,
        invitationsRefusal: this.invitationsRefusal,
        members: this.members,
        membersRefusal: this.membersRefusal,
        selectedCompanyId: this.selectedCompanyId
      });
    }
  },
  watch: {
    storeId () { this.load(); }
  },
  mounted () {
    this.load();
  },
  methods: {
    failureKey (op) {
      const failure = this.failures[op];
      return failure ? failure.key : null;
    },

    /**
     * Clear a panel's form after its write landed.
     *
     * Guarded rather than called straight off the ref: a panel is only mounted while a company is
     * selected, and the reset is a courtesy — a page that threw here would report a successful write
     * as a failure.
     */
    resetPanel (ref, method) {
      const panel = this.$refs[ref];
      if (panel && typeof panel[method] === 'function') { panel[method](); }
    },

    failureDetail (op) {
      const failure = this.failures[op];
      return failure ? failure.detail : null;
    },

    /**
     * The venue-scoped reads: the company directory, and the store's market.
     *
     * The market read is a different surface with a different error envelope, so its failure is
     * simply "no market" rather than a Meals refusal — the two panels that consume it withhold their
     * control and say why, which is the only claim an unanswered market supports.
     */
    async load () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.loading = true;

      // Cleared to UNKNOWN, not to empty. A reload in flight must not render as a venue that has
      // suddenly stopped having company accounts.
      this.directory = null;
      this.directoryRefusal = null;

      const [directory, market] = await Promise.all([
        this._mealsStoreService.ListCompanies(this.storeId)
          .catch((e) => { this.directoryRefusal = refusalOf(e); return null; }),
        this._storeMarketService.Get(this.storeId).catch(() => null)
      ]);

      this.directory = directory;
      this.market = market;
      this.loading = false;

      if (this.selectedCompanyId) { await this.loadCompany(); }
    },

    /**
     * The four company-scoped reads, in parallel and failing independently.
     *
     * They are cleared to UNKNOWN first for the same reason the directory is: a company being
     * re-read is not a company with no invitations.
     */
    async loadCompany () {
      const companyId = this.selectedCompanyId;
      if (!companyId) { return; }

      this.company = null;
      this.companyRefusal = null;
      this.programs = null;
      this.programsRefusal = null;
      this.invitations = null;
      this.invitationsRefusal = null;
      this.members = null;
      this.membersRefusal = null;

      const service = this._mealsAdminService;
      const [company, programs, invitations, members] = await Promise.all([
        service.GetCompany(companyId).catch((e) => { this.companyRefusal = refusalOf(e); return null; }),
        service.ListPrograms(companyId).catch((e) => { this.programsRefusal = refusalOf(e); return null; }),
        service.ListInvitations(companyId).catch((e) => { this.invitationsRefusal = refusalOf(e); return null; }),
        service.ListMembers(companyId).catch((e) => { this.membersRefusal = refusalOf(e); return null; })
      ]);

      // A slower read for a company the operator has since navigated away from must not overwrite
      // the current one's answers.
      if (this.selectedCompanyId !== companyId) { return; }

      this.company = company;
      this.programs = programs;
      this.invitations = invitations;
      this.members = members;

      // Keep the programme selection only while it is still one of this company's.
      if (this.selectedProgramId && !this.view.programs.rows.some(row => row.programId === this.selectedProgramId)) {
        this.selectedProgramId = null;
      }
    },

    select (companyId) {
      if (this.selectedCompanyId === companyId) { return; }
      this.selectedCompanyId = companyId;
      this.selectedProgramId = null;
      // A token belongs to the company it was issued for and to no other; switching company takes it
      // off the screen rather than leaving it above somebody else's member list.
      this.issued = null;
      this.loadCompany();
    },

    selectProgram (programId) {
      this.selectedProgramId = this.selectedProgramId === programId ? null : programId;
    },

    /**
     * One mutation, with its own busy flag and its own failure slot.
     *
     * `scope` decides which sentence a 403 or a 404 gets, and the three are genuinely different
     * people to go and talk to: the venue's flag, the installation's config, or whoever grants the
     * concierge role.
     */
    async run (op, scope, call) {
      this.busy = op;
      this.failures[op] = null;
      try {
        return { ok: true, result: await call() };
      } catch (error) {
        this.failures[op] = { key: writeFailureKey(error, scope), detail: problemDetail(error) };
        return { ok: false, error };
      } finally {
        this.busy = null;
      }
    },

    async createCompany (request) {
      const outcome = await this.run('createCompany', SCOPE_CONCIERGE, () => this._mealsAdminService.CreateCompany(request));
      if (!outcome.ok) { return; }

      const created = outcome.result || {};
      // Held in session state because the venue directory cannot see a company with no corridor yet.
      this.sessionCompanies = this.sessionCompanies
        .filter(row => row.companyId !== created.companyId)
        .concat([created]);
      this.resetPanel('companyPanel', 'resetCreate');
      this.select(created.companyId);
    },

    async updateCompany (request) {
      const outcome = await this.run('updateCompany', SCOPE_COMPANY,
        () => this._mealsAdminService.UpdateCompany(this.selectedCompanyId, request));
      if (outcome.ok) { await this.loadCompany(); }
    },

    async signAgreement (request) {
      const companyId = this.selectedCompanyId;
      const outcome = await this.run('signAgreement', SCOPE_CORRIDOR,
        () => this._mealsAdminService.SignAgreement(this.storeId, companyId, request));
      if (!outcome.ok) { return; }

      // The venue directory is the authority on which corridor a company has here, so it is re-read
      // rather than patched from the signing response.
      await this.load();
    },

    async createProgram (request) {
      const outcome = await this.run('createProgram', SCOPE_COMPANY,
        () => this._mealsAdminService.CreateProgram(this.selectedCompanyId, request));
      if (!outcome.ok) { return; }

      this.resetPanel('programPanel', 'resetProgram');
      await this.loadCompany();
      const created = outcome.result || {};
      if (created.programId) { this.selectedProgramId = created.programId; }
    },

    async createPolicy (payload) {
      const outcome = await this.run('createPolicy', SCOPE_COMPANY,
        () => this._mealsAdminService.CreatePolicyVersion(payload.programId, payload.request));
      // Re-read either way is wrong: on failure nothing changed, and re-reading would clear the
      // programme selection the operator is still looking at. Only success moves the version number.
      if (outcome.ok) { await this.loadCompany(); }
    },

    async createInvitation (request) {
      const outcome = await this.run('createInvitation', SCOPE_COMPANY,
        () => this._mealsAdminService.CreateInvitation(this.selectedCompanyId, request));
      if (!outcome.ok) { return; }

      // The ONLY moment the plaintext token exists outside the server. It is put on screen before
      // anything else happens, and the reload below cannot displace it — no read returns it.
      this.issued = outcome.result || null;
      this.resetPanel('peoplePanel', 'resetInvitation');
      await this.loadCompany();
    },

    async revokeInvitation (payload) {
      const outcome = await this.run('revokeInvitation', SCOPE_COMPANY,
        () => this._mealsAdminService.RevokeInvitation(
          this.selectedCompanyId, payload.invitationId, { expectedVersion: payload.expectedVersion }));
      if (outcome.ok) { await this.loadCompany(); }
    }
  }
};
</script>

<style lang="scss" scoped>
// Relative, like every other page in this directory that imports a partial: sass-loader's `~`
// resolves to node_modules, not to the Nuxt srcDir alias.
@import '../../components/admin/meals/meals-admin';

.meals-setup {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.meals-setup__header {
  margin-bottom: 24px;
}

.meals-setup__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.meals-setup__intro {
  color: #64748b;
  margin: 0;
}

.meals-setup__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
</style>
