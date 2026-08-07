<template>
  <AdminPage @login-success="init">
    <div class="wfrl-page">
      <div class="wfrl-page__header">
        <h1 class="wfrl-page__title">
          {{ $i('wfrl_page_title') }}
        </h1>
        <p class="wfrl-page__intro">
          {{ $i('wfrl_page_intro') }}
        </p>
      </div>

      <transition name="wfrl-toast">
        <div v-if="toast.show" class="wfrl-page__toast" :class="'wfrl-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wfrl-page__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <!-- THE CATALOGUE ---------------------------------------------------------------------- -->
        <section class="wfrl-page__section">
          <h2 class="wfrl-page__section-title">
            {{ $i('wfrl_list_title') }}
          </h2>

          <!-- A read that FAILED is not a store without roles. The two are different claims and the
               dangerous one is the second: a manager told "this store has no roles" types the whole
               catalogue again. -->
          <p v-if="roles === null" class="wfrl-page__unknown">
            {{ $i('wfrl_list_unknown') }}
          </p>

          <p v-else-if="!roles.length" class="wfrl-page__empty" data-wfrl-empty>
            {{ $i('wfrl_list_empty') }}
          </p>

          <div v-else class="wfrl-page__table-scroll">
            <table class="wfrl-table">
              <thead>
                <tr>
                  <th class="wfrl-table__th">
                    {{ $i('wfrl_col_name') }}
                  </th>
                  <th class="wfrl-table__th">
                    {{ $i('wfrl_col_station') }}
                  </th>
                  <th class="wfrl-table__th wfrl-table__th--num">
                    {{ $i('wfrl_col_sort') }}
                  </th>
                  <th class="wfrl-table__th">
                    {{ $i('wfrl_col_status') }}
                  </th>
                  <th v-if="canManage" class="wfrl-table__th" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="role in orderedRoles"
                  :key="role.roleId"
                  class="wfrl-table__row"
                  :class="{ 'wfrl-table__row--retired': role.retired }"
                  :data-wfrl-role="role.name"
                >
                  <td class="wfrl-table__td">
                    <span class="wfrl-table__swatch" :style="{ backgroundColor: role.color || 'transparent' }" />
                    <span class="wfrl-table__name">{{ role.name || $i('wfrl_role_unnamed') }}</span>
                  </td>
                  <td class="wfrl-table__td">
                    {{ role.station || '—' }}
                  </td>
                  <td class="wfrl-table__td wfrl-table__td--num">
                    {{ role.sortOrder }}
                  </td>
                  <td class="wfrl-table__td">
                    <span v-if="role.retired" class="wfrl-table__tag">{{ $i('wfrl_status_retired') }}</span>
                    <span v-else class="wfrl-table__tag wfrl-table__tag--on">{{ $i('wfrl_status_active') }}</span>
                  </td>
                  <td v-if="canManage" class="wfrl-table__td wfrl-table__td--actions">
                    <button class="wfrl-page__link" :disabled="saving" @click="editRole(role)">
                      {{ $i('wfrl_action_edit') }}
                    </button>
                    <button
                      v-if="!role.retired"
                      class="wfrl-page__link"
                      :disabled="saving"
                      @click="retireRole(role)"
                    >
                      {{ $i('wfrl_action_retire') }}
                    </button>
                    <button v-else class="wfrl-page__link" :disabled="saving" @click="reinstateRole(role)">
                      {{ $i('wfrl_action_reinstate') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="wfrl-page__note">
            {{ $i('wfrl_no_authority_note') }}
          </p>
        </section>

        <!-- AUTHORING -------------------------------------------------------------------------- -->
        <!-- One refusal for the whole form. The catalogue READ is WorkforceScheduler and the write is
             WorkforceManager, so a scheduler can legitimately see the list above and be refused this
             — which is why the refusal replaces the form rather than the page. -->
        <section v-if="!canManage" class="wfrl-page__section wfrl-page__refusal">
          <h2 class="wfrl-page__refusal-title">
            {{ $i('wfrl_form_title_new') }}
          </h2>
          <p>{{ $i('wfrl_no_capability') }}</p>
        </section>

        <section v-else class="wfrl-page__section">
          <h2 class="wfrl-page__section-title">
            {{ editing ? $i('wfrl_form_title_edit', { name: editingName }) : $i('wfrl_form_title_new') }}
          </h2>

          <form class="wfrl-form" @submit.prevent="submit">
            <div class="wfrl-form__row">
              <label class="wfrl-form__field">
                <span class="wfrl-form__label">{{ $i('wfrl_field_name') }}</span>
                <input
                  v-model="form.name"
                  type="text"
                  class="wfrl-form__input"
                  :maxlength="NAME_MAX"
                  data-wfrl-name
                  @input="nameError = ''"
                >
              </label>

              <label class="wfrl-form__field">
                <span class="wfrl-form__label">{{ $i('wfrl_field_station') }}</span>
                <input
                  v-model="form.station"
                  type="text"
                  class="wfrl-form__input"
                  :maxlength="STATION_MAX"
                  data-wfrl-station
                >
              </label>
            </div>

            <div class="wfrl-form__row">
              <label class="wfrl-form__field wfrl-form__field--narrow">
                <span class="wfrl-form__label">{{ $i('wfrl_field_sort') }}</span>
                <input
                  v-model.number="form.sortOrder"
                  type="number"
                  min="0"
                  step="1"
                  class="wfrl-form__input"
                  data-wfrl-sort
                >
              </label>

              <label class="wfrl-form__field wfrl-form__field--narrow">
                <span class="wfrl-form__label">{{ $i('wfrl_field_color') }}</span>
                <input v-model="form.color" type="color" class="wfrl-form__colour" data-wfrl-color>
              </label>
            </div>

            <p v-if="nameError" class="wfrl-form__error" data-wfrl-error>
              {{ nameError }}
            </p>

            <p class="wfrl-form__hint">
              {{ $i('wfrl_form_hint') }}
            </p>

            <div class="wfrl-form__actions">
              <button type="submit" class="wfrl-page__button" :disabled="saving" data-wfrl-submit>
                {{ saving ? $i('wfrl_saving') : (editing ? $i('wfrl_action_save') : $i('wfrl_action_create')) }}
              </button>
              <button
                v-if="editing"
                type="button"
                class="wfrl-page__button wfrl-page__button--ghost"
                :disabled="saving"
                @click="resetForm()"
              >
                {{ $i('wfrl_action_cancel') }}
              </button>
            </div>
          </form>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { contextRefusalKey } from '~/utils/workforce/context-refusal';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import { CAPABILITY_MANAGER, callerHas } from '~/utils/workforce/roster';
import { parseApiInstant } from '~/utils/workforce/week-range';

// The column widths the write actually has to fit — `Helpers/ApplicationDbContext.cs` declares
// `Name`/`Station` as nvarchar(128) and `Color` as nvarchar(32). Enforced here as `maxlength` rather
// than left to the server because the server does not check them at all: `UpsertRolesAsync` assigns
// the strings straight onto the entity, so an over-long name is not a validation error a manager can
// read, it is a `DbUpdateException` on save.
const NAME_MAX = 128;
const STATION_MAX = 128;

// A role with no colour renders as a blank chip on the week grid, which reads as a rendering fault
// rather than as a choice. `<input type="color">` cannot be empty anyway — it reports `#000000` when
// unset — so the catalogue picks a legible default instead of a black one.
const DEFAULT_COLOUR = '#1bb776';

// THE ROLE CATALOGUE — the screen `roster-client.js` deferred to for as long as it existed.
//
// WHY THIS PAGE EXISTS. `PUT /workforce/stores/{id}/roles` (#9) has been live on the wire the whole
// time and had no caller in any browser. The consequence was not abstract: a role is the axis every
// planning surface pivots on, so a store whose catalogue nobody had seeded out of band could not be
// scheduled at all. `workforce-schedule.vue`'s shift editor offered a role select with no options,
// `workforce-rates.vue` could not open a role rate because it had no role to open one for, and
// `WorkforceEngagementPanel.vue` printed "Butikken har ingen funksjoner definert" while offering no
// way to define one. Three dead ends, one missing screen.
//
// WHAT A ROLE IS, AND IS NOT. It is a station — bar, kitchen, floor — with a name, a colour and a
// sort order. It carries NO authority: capabilities live on the engagement, and the backend model
// says so out loud. That sentence is on screen because a catalogue of names that looked like an
// access-control list would be the most expensive possible misreading of this page.
//
// WHAT IT DELIBERATELY DOES NOT OFFER. There is no delete, here or anywhere in the family — the
// backend binds none, for any resource. A role leaves the working catalogue by being RETIRED
// (`effectiveToUtc`), keeps its id and keeps being returned by the read, because a week already
// planned against it must still be able to name it. Retiring is an upsert like any other, which is
// why the control sits in the row rather than behind a separate verb.
//
// THE RATE IS NOT HERE EITHER. A role's hourly rate is a different table (`WorkforceRoleRateVersions`)
// behind a harder grant — WorkforceManager AND WorkforcePayrollApprover, on the read as much as the
// write — and it is authored on `/admin/workforce-rates`. Putting a rate field on this form would
// have meant either widening this page's grant to payroll or shipping a field that 403s for the
// manager it is shown to.
export default {
  name: 'AdminWorkforceRoles',
  components: { AdminPage },
  data () {
    return {
      contextError: '',
      capabilities: [],

      // null means UNKNOWN — the read has not answered, or it failed. An empty array is a positive
      // answer and a different claim; the two are never initialised to the same value.
      roles: null,

      form: this.blankForm(),
      nameError: '',
      saving: false,

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
    NAME_MAX () { return NAME_MAX; },
    STATION_MAX () { return STATION_MAX; },
    _rosterService () {
      return new WorkforceRosterService(this._coreInitializer);
    },
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    editing () {
      return !!this.form.roleId;
    },
    editingName () {
      const role = (this.roles || []).find(r => r.roleId === this.form.roleId);
      return (role && role.name) || this.$i('wfrl_role_unnamed');
    },
    /**
     * The catalogue in the order the server states it — sortOrder, then name — with the retirement
     * already decided so the template does not do date arithmetic in a `v-if`.
     */
    orderedRoles () {
      return (this.roles || []).map(role => Object.assign({}, role, {
        retired: this.roleIsRetired(role)
      }));
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
    blankForm () {
      return { roleId: null, name: '', station: '', color: DEFAULT_COLOUR, sortOrder: 0, effectiveToUtc: null };
    },

    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.contextError = '';
      this.capabilities = [];
      this.roles = null;
      this.resetForm();

      try {
        const context = await this._rosterService.GetContext(this.storeId);
        this.capabilities = (context && context.capabilities) || [];
      } catch (e) {
        this.contextError = this.$i(contextRefusalKey(e, {
          noCapability: 'wfrl_no_workforce_access',
          failed: 'wfrl_context_failed'
        }));
        return;
      }

      await this.loadRoles();

      // The default sort order can only be computed once the catalogue has ANSWERED. `resetForm`
      // above ran while `roles` was still null and therefore seeded 1 — which on a store that
      // already has roles collides with the first one instead of landing after the last. Re-seeded
      // here, and only while the form is still untouched, so a manager who started typing during a
      // slow read does not have the field changed under them.
      if (!this.form.roleId && !this.form.name) {
        this.form.sortOrder = this.nextSortOrder();
      }
    },

    async loadRoles () {
      // Cleared to unknown, never to empty: an in-flight read must not spend a frame claiming this
      // store has no roles, which is the claim that sends a manager to retype a catalogue.
      this.roles = null;
      try {
        const roles = await this._rosterService.ListRoles(this.storeId);
        this.roles = Array.isArray(roles) ? roles : null;
      } catch (e) {
        this.roles = null;
        this.notifyError(e, 'wfrl_list_failed');
      }
    },

    /**
     * A role retired at or before now.
     *
     * `effectiveToUtc` is parsed with `parseApiInstant` like every other stamp on these surfaces —
     * it arrives BARE off a column load, and `new Date` would read it as browser-local and retire a
     * role up to a day early or late.
     */
    roleIsRetired (role) {
      const until = parseApiInstant(role && role.effectiveToUtc);
      return !!until && until.getTime() <= Date.now();
    },

    resetForm () {
      this.form = this.blankForm();
      this.form.sortOrder = this.nextSortOrder();
      this.nameError = '';
    },

    /** One past the highest in use, so a new role lands at the end rather than colliding at 0. */
    nextSortOrder () {
      const orders = (this.roles || [])
        .map(r => Number(r.sortOrder))
        .filter(n => Number.isFinite(n));
      return orders.length ? Math.max.apply(null, orders) + 1 : 1;
    },

    editRole (role) {
      this.nameError = '';
      this.form = {
        roleId: role.roleId,
        name: role.name || '',
        station: role.station || '',
        color: role.color || DEFAULT_COLOUR,
        sortOrder: Number.isFinite(Number(role.sortOrder)) ? Number(role.sortOrder) : 0,
        // CARRIED, NOT DROPPED — see `itemFor`. Editing a retired role's name must not silently
        // bring it back.
        effectiveToUtc: role.effectiveToUtc || null
      };
    },

    retireRole (role) {
      return this.write([this.itemFor(role, { effectiveToUtc: new Date().toISOString() })], 'wfrl_toast_retired');
    },

    reinstateRole (role) {
      return this.write([this.itemFor(role, { effectiveToUtc: null })], 'wfrl_toast_reinstated');
    },

    /**
     * One upsert item built from a role already in the catalogue, plus whatever this act changes.
     *
     * EVERY FIELD IS RESTATED, and that is a requirement of the endpoint rather than caution.
     * `UpsertRolesAsync` assigns `Name`, `Station`, `Color`, `SortOrder` and — this is the sharp
     * one — `EffectiveToUtc` onto the tracked entity UNCONDITIONALLY from the item it is sent. So an
     * item that omitted `effectiveToUtc` would not "leave the retirement alone", it would CLEAR it:
     * renaming a retired role would quietly put it back on every manager's role select. Only
     * `EffectiveFromUtc` is conditional (`if (item.EffectiveFromUtc.HasValue)`), which is why it is
     * the one field this method does not send — the role keeps the day it started.
     */
    itemFor (role, changes) {
      return Object.assign({
        roleId: role.roleId,
        name: role.name,
        station: role.station,
        color: role.color,
        sortOrder: role.sortOrder,
        effectiveToUtc: role.effectiveToUtc || null
      }, changes || {});
    },

    submit () {
      const name = (this.form.name || '').trim();
      if (!name) {
        // The server does not check this — it would store the blank and the role would appear on
        // every select as an unnamed option nobody can identify. Refused here, where it can be said.
        this.nameError = this.$i('wfrl_error_name_required');
        return;
      }

      const sortOrder = Number(this.form.sortOrder);
      const item = {
        name,
        station: (this.form.station || '').trim() || null,
        color: this.form.color || DEFAULT_COLOUR,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        effectiveToUtc: this.form.effectiveToUtc || null
      };
      // An item WITHOUT a roleId is a create; WITH one it edits that role in place. The absence is
      // the discriminator, so it is left off entirely rather than sent as null.
      if (this.form.roleId) { item.roleId = this.form.roleId; }

      return this.write([item], this.editing ? 'wfrl_toast_saved' : 'wfrl_toast_created');
    },

    /**
     * The one write on this page.
     *
     * Sends ONE item, never the catalogue. `PUT /roles` is a merge — roles absent from the request
     * are left untouched — so resending the whole list would turn every save into a rewrite of rows
     * this manager did not touch, and would race any other manager editing a different role.
     *
     * The response IS the new catalogue (full list, server-ordered), so it is adopted directly
     * rather than followed by a re-read: a second GET could observe a different write and would make
     * the toast describe a state the screen is not showing.
     */
    async write (items, successKey) {
      if (this.saving) { return; }
      this.saving = true;
      try {
        const roles = await this._rosterService.UpsertRoles(this.storeId, items);
        this.roles = Array.isArray(roles) ? roles : this.roles;
        this.resetForm();
        this.notify(this.$i(successKey));
      } catch (e) {
        this.notifyError(e, 'wfrl_save_failed');
      } finally {
        this.saving = false;
      }
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },

    /**
     * A failure is reported with the server's own wording when it typed one, and with this page's
     * fallback when it did not. A read that failed never becomes a claim about the data.
     */
    notifyError (e, fallbackKey) {
      const detail = isWorkforceApiError(e) && e.message ? e.message : this.$i(fallbackKey);
      this.notify(detail, 'error');
    }
  }
};
</script>

<style scoped>
.wfrl-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.wfrl-page__header { margin-bottom: 18px; }
.wfrl-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfrl-page__intro { color: #64748b; margin: 0; }

.wfrl-page__section { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 18px; }
.wfrl-page__section-title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 14px; }

.wfrl-page__blocker { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; color: #b42318; }
.wfrl-page__refusal { border-color: #fed7aa; background: #fffbf5; }
.wfrl-page__refusal-title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 8px; }

.wfrl-page__unknown, .wfrl-page__empty { color: #64748b; margin: 0 0 4px; }
.wfrl-page__note { color: #64748b; font-size: 0.85rem; margin: 14px 0 0; }

/* Wide content scrolls INSIDE its own track. Without this the table pushes the grid column wider
   than the viewport at laptop widths and the next column paints over the controls — a sibling lane
   found exactly that defect at 1280, on a page whose buttons were then unclickable. */
.wfrl-page__table-scroll { overflow-x: auto; }
.wfrl-table { width: 100%; border-collapse: collapse; }
.wfrl-table__th { text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 0 12px 8px 0; white-space: nowrap; }
.wfrl-table__th--num, .wfrl-table__td--num { text-align: right; }
.wfrl-table__row { border-top: 1px solid #eef2f6; }
.wfrl-table__row--retired .wfrl-table__name { color: #94a3b8; text-decoration: line-through; }
.wfrl-table__td { padding: 10px 12px 10px 0; color: #292c34; vertical-align: middle; }
.wfrl-table__td--actions { white-space: nowrap; text-align: right; }
.wfrl-table__swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; vertical-align: middle; border: 1px solid #e2e8f0; }
.wfrl-table__name { vertical-align: middle; }
.wfrl-table__tag { display: inline-block; font-size: 0.78rem; padding: 2px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; }
.wfrl-table__tag--on { background: #ecfdf3; color: #027a48; }

.wfrl-form__row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 14px; }
.wfrl-form__field { display: flex; flex-direction: column; flex: 1 1 240px; min-width: 0; }
.wfrl-form__field--narrow { flex: 0 1 160px; }
.wfrl-form__label { font-size: 0.85rem; color: #64748b; margin-bottom: 6px; }
.wfrl-form__input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 11px; font-size: 0.95rem; color: #292c34; width: 100%; box-sizing: border-box; }
.wfrl-form__colour { border: 1px solid #cbd5e1; border-radius: 8px; padding: 3px; height: 40px; width: 100%; box-sizing: border-box; background: #fff; }
.wfrl-form__error { color: #b42318; margin: 0 0 10px; }
.wfrl-form__hint { color: #64748b; font-size: 0.85rem; margin: 0 0 14px; }
.wfrl-form__actions { display: flex; gap: 10px; flex-wrap: wrap; }

.wfrl-page__button { background: #292c34; color: #fff; border: 1px solid #292c34; border-radius: 8px; padding: 9px 18px; font-size: 0.95rem; cursor: pointer; }
.wfrl-page__button:disabled { opacity: 0.55; cursor: default; }
.wfrl-page__button--ghost { background: #fff; color: #292c34; }
.wfrl-page__link { background: none; border: none; color: #2563eb; cursor: pointer; padding: 0 0 0 14px; font-size: 0.9rem; }
.wfrl-page__link:disabled { opacity: 0.55; cursor: default; }

.wfrl-page__toast { position: fixed; right: 24px; bottom: 24px; z-index: 40; padding: 12px 18px; border-radius: 8px; color: #fff; background: #027a48; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18); }
.wfrl-page__toast--error { background: #b42318; }
.wfrl-toast-enter-active, .wfrl-toast-leave-active { transition: opacity 0.2s ease; }
.wfrl-toast-enter, .wfrl-toast-leave-to { opacity: 0; }
</style>
