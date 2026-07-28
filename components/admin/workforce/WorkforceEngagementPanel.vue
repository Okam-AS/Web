<template>
  <aside class="wfr-panel">
    <div class="wfr-panel__head">
      <div>
        <h2 class="wfr-panel__title">
          {{ orDash(row.displayName) }}
        </h2>
        <p class="wfr-panel__sub">
          {{ $i('wfr_panel_engagement_of', { store: storeId }) }}
        </p>
      </div>
      <button class="wfr-panel__close" type="button" @click="$emit('close')">
        ×
      </button>
    </div>

    <!-- The person / engagement split, stated rather than implied. The manager is looking at ONE
         engagement; the human behind it is a chain-wide record that this store neither owns nor can
         see the rest of. -->
    <dl class="wfr-panel__facts">
      <dt>{{ $i('wfr_panel_person_state') }}</dt>
      <dd>{{ personStateLabel }}</dd>
      <dt>{{ $i('wfr_panel_contact') }}</dt>
      <dd v-if="detail">
        {{ orDash(detail.contactEmail) }} · {{ orDash(detail.contactPhone) }}
      </dd>
      <dd v-else class="is-unknown">
        {{ $i('wfr_panel_detail_unknown') }}
      </dd>
      <dt>{{ $i('wfr_panel_employer') }}</dt>
      <dd class="is-mono">
        {{ orDash(row.legalEmployerId) }}
      </dd>
      <dt>{{ $i('wfr_panel_active_window') }}</dt>
      <dd>{{ orDash(date(row.activeFromUtc)) }} → {{ orDash(date(row.activeToUtc)) }}</dd>
    </dl>

    <p v-if="row.engagementCount > 1" class="wfr-panel__note">
      {{ $i('wfr_panel_multi_engagement', { count: row.engagementCount }) }}
    </p>

    <!-- CAPABILITIES ------------------------------------------------------------------------- -->
    <section class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_capabilities') }}</h3>
      <p class="wfr-panel__hint">
        {{ $i('wfr_panel_capabilities_hint') }}
      </p>
      <div class="wfr-panel__caps">
        <label v-for="capability in allCapabilities" :key="capability" class="wfr-panel__cap">
          <input
            type="checkbox"
            :checked="draftCapabilities.includes(capability)"
            :disabled="!canManage || busy"
            @change="toggleCapability(capability)"
          >
          <span>{{ $i('wfr_cap_' + short(capability)) }}</span>
          <small>{{ $i('wfr_cap_desc_' + short(capability)) }}</small>
        </label>
      </div>
      <p v-if="losingLastManager" class="wfr-panel__danger">
        {{ $i('wfr_last_manager_warning') }}
      </p>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy || !capabilitiesChanged || losingLastManager"
        @click="$emit('save-capabilities', draftCapabilities)"
      >
        {{ $i('wfr_save') }}
      </button>
    </section>

    <!-- THE ENGAGEMENT'S OWN NUMBERS ------------------------------------------------------------
         Payroll identifiers of the ENGAGEMENT, not of the person: the same human engaged at two
         venues carries two of these, and changing one here never touches the other. -->
    <section class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_numbers') }}</h3>
      <div class="wfr-panel__termgrid wfr-panel__termgrid--pair">
        <input
          v-model.trim="draftEmploymentNumber"
          class="wfr-panel__input"
          type="text"
          :placeholder="$i('wfr_add_employment_number')"
          :disabled="!canManage || busy"
        >
        <input
          v-model.trim="draftPayrollNumber"
          class="wfr-panel__input"
          type="text"
          :placeholder="$i('wfr_add_payroll_number')"
          :disabled="!canManage || busy"
        >
      </div>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy || !numbersChanged"
        @click="$emit('save-numbers', { employmentNumber: draftEmploymentNumber, payrollNumber: draftPayrollNumber })"
      >
        {{ $i('wfr_save') }}
      </button>
    </section>

    <!-- ROLES -------------------------------------------------------------------------------- -->
    <section class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_roles') }}</h3>
      <!-- The single most important sentence on this panel. A role is a station, not a permission;
           the block above is where power lives. Planday conflates the two and this must not. -->
      <p class="wfr-panel__hint">
        {{ $i('wfr_panel_roles_hint') }}
      </p>
      <p v-if="roles === null" class="wfr-panel__unknown">
        {{ $i('wfr_panel_roles_unknown') }}
      </p>
      <p v-else-if="!roles.length" class="wfr-panel__unknown is-answered">
        {{ $i('wfr_panel_roles_none_defined') }}
      </p>
      <template v-else>
        <p v-if="staffRoles === null" class="wfr-panel__unknown">
          {{ $i('wfr_panel_staff_roles_unknown') }}
        </p>
        <div v-else class="wfr-panel__roles">
          <label v-for="role in roles" :key="role.roleId" class="wfr-panel__role">
            <input
              type="checkbox"
              :checked="draftRoles.includes(role.roleId)"
              :disabled="!canManage || busy"
              @change="toggleRole(role.roleId)"
            >
            <span>{{ orDash(role.name) }}</span>
            <small v-if="role.station">{{ role.station }}</small>
            <small v-if="role.retired" class="is-retired">{{ $i('wfr_role_retired') }}</small>
          </label>
        </div>
        <button
          class="wfr-panel__btn"
          type="button"
          :disabled="!canManage || busy || staffRoles === null || !rolesChanged"
          @click="$emit('save-roles', draftRoles)"
        >
          {{ $i('wfr_save') }}
        </button>
      </template>
    </section>

    <!-- EMPLOYMENT TERMS --------------------------------------------------------------------- -->
    <section class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_terms') }}</h3>
      <p v-if="terms === null" class="wfr-panel__unknown">
        {{ $i('wfr_panel_terms_unknown') }}
      </p>
      <p v-else-if="!terms.length" class="wfr-panel__unknown is-answered">
        {{ $i('wfr_panel_terms_none') }}
      </p>
      <ul v-else class="wfr-panel__terms">
        <li v-for="term in terms" :key="term.id" :class="{ 'is-open': term.isOpen }">
          <span class="wfr-panel__term-dates">
            {{ orDash(date(term.effectiveFromUtc)) }} → {{ orDash(date(term.effectiveToUtc)) }}
          </span>
          <span class="wfr-panel__term-fact">
            {{ $i('wfr_term_contract') }}: {{ contractLabel(term) }}
          </span>
          <span class="wfr-panel__term-fact">{{ $i('wfr_term_category') }}: {{ orDash(term.employmentCategory) }}</span>
          <!-- A null wage means two different things depending on who is asking, so the screen says
               which one it is instead of printing an empty field either way. -->
          <span class="wfr-panel__term-fact" :class="'is-wage-' + term.wageState">
            {{ $i('wfr_term_wage') }}: {{ wageLabel(term) }}
          </span>
        </li>
      </ul>

      <!-- Appending a term, not editing one. The server closes the previous open term at the new
           one's effective instant, so the history is a chain of non-overlapping facts rather than a
           field somebody overwrote. An engagement created on this page starts with no term at all,
           which is why the form is here rather than on a screen of its own. -->
      <div v-if="canManage && terms !== null" class="wfr-panel__termform">
        <label class="wfr-panel__sublabel">{{ $i('wfr_term_new') }}</label>
        <div class="wfr-panel__termgrid">
          <input
            v-model="newTerm.effectiveFromDate"
            class="wfr-panel__input"
            type="date"
            :disabled="busy"
          >
          <input
            v-model="newTerm.contractHoursPerWeek"
            class="wfr-panel__input"
            type="number"
            step="0.5"
            min="0"
            :placeholder="$i('wfr_term_hours_placeholder')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.employmentCategory"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_category')"
            :disabled="busy"
          >
        </div>
        <!-- Wage is offered only to a caller who may READ one: the endpoint refuses a wage write
             from anyone without the payroll capability, so showing the field otherwise would turn
             every save into a 403. -->
        <div v-if="hasPayrollApprover" class="wfr-panel__termgrid">
          <input
            v-model="newTerm.wageAmount"
            class="wfr-panel__input"
            type="number"
            step="0.01"
            min="0"
            :placeholder="$i('wfr_term_wage')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.wageCurrency"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_wage_currency')"
            :disabled="busy"
          >
          <input
            v-model.trim="newTerm.wageInterval"
            class="wfr-panel__input"
            type="text"
            :placeholder="$i('wfr_term_wage_interval')"
            :disabled="busy"
          >
        </div>
        <button
          class="wfr-panel__btn"
          type="button"
          :disabled="busy || !newTerm.effectiveFromDate"
          @click="$emit('save-term', newTerm)"
        >
          {{ $i('wfr_term_add') }}
        </button>
      </div>
    </section>

    <!-- ENDING ------------------------------------------------------------------------------- -->
    <section v-if="row.isActive" class="wfr-panel__section wfr-panel__section--end">
      <h3>{{ $i('wfr_panel_end') }}</h3>

      <!-- What ending actually does, in the order it will bite. None of it is a deletion: this
           surface binds no DELETE for anything. -->
      <ul class="wfr-panel__effects">
        <li>{{ $i('wfr_end_effect_shifts') }}</li>
        <li>{{ $i('wfr_end_effect_selfservice') }}</li>
        <li :class="openSessionClass">
          {{ openSessionLabel }}
        </li>
        <li class="is-safe">
          {{ $i('wfr_end_effect_personnel_list') }}
        </li>
      </ul>

      <p v-if="effects.stranding" class="wfr-panel__danger">
        {{ $i('wfr_last_manager_warning') }}
      </p>

      <label class="wfr-panel__endcheck">
        <input v-model="recordEndDate" type="checkbox" :disabled="busy">
        <span>{{ $i('wfr_end_record_date') }}</span>
      </label>
      <input v-if="recordEndDate" v-model="endDate" class="wfr-panel__input" type="date" :disabled="busy">
      <p v-if="recordEndDate" class="wfr-panel__danger">
        {{ $i('wfr_end_date_one_way') }}
      </p>

      <button
        class="wfr-panel__btn wfr-panel__btn--danger"
        type="button"
        :disabled="!canManage || busy || effects.stranding || blockedByOpenSession"
        @click="$emit('end', { recordEndDate, endDate })"
      >
        {{ $i('wfr_end_submit') }}
      </button>
    </section>

    <section v-else class="wfr-panel__section">
      <h3>{{ $i('wfr_panel_reactivate') }}</h3>
      <p class="wfr-panel__hint">
        {{ $i('wfr_reactivate_hint') }}
      </p>
      <!-- The end date is unclearable through this API, and the schedule refuses any shift past it.
           Reactivating such an engagement produces someone who is active and unschedulable. -->
      <p v-if="reactivationCap" class="wfr-panel__danger">
        {{ $i('wfr_reactivate_capped', { date: date(reactivationCap) }) }}
      </p>
      <button
        class="wfr-panel__btn"
        type="button"
        :disabled="!canManage || busy"
        @click="$emit('reactivate')"
      >
        {{ $i('wfr_reactivate_submit') }}
      </button>
    </section>
  </aside>
</template>

<script>
import {
  CAPABILITIES,
  CAPABILITY_MANAGER,
  SESSIONS_UNKNOWN,
  contractHoursPerWeek,
  formatDate,
  orDash,
  reactivationBlockedBy,
  WAGE_SET,
  WAGE_WITHHELD
} from '~/utils/workforce/roster';

// One engagement, in full: what this person may do here, which stations they work, what their
// contract says, and how the employment ends.
//
// The panel edits an ENGAGEMENT, never a person. Nothing here changes the human's chain-wide record
// — the surface exposes no route that would — and nothing here can see or say anything about that
// human's engagements at other stores.
export default {
  name: 'WorkforceEngagementPanel',
  props: {
    row: { type: Object, required: true },
    // The `GET /staff/{id}` body, or null when that read has not answered. Null is unknown, not
    // "this engagement has no contact details".
    detail: { type: Object, default: null },
    roster: { type: Object, required: true },
    roles: { type: Array, default: null },
    staffRoles: { type: Array, default: null },
    terms: { type: Array, default: null },
    effects: { type: Object, required: true },
    canManage: { type: Boolean, default: false },
    // Decides whether a term's null wage means "withheld" or "none", and whether the wage fields on
    // the term form may be offered at all.
    hasPayrollApprover: { type: Boolean, default: false },
    storeId: { type: [String, Number], default: '' },
    timeZoneId: { type: String, default: null },
    locale: { type: String, default: 'no' },
    busy: { type: Boolean, default: false },
    asOf: { type: Date, default: () => new Date() }
  },
  data () {
    return {
      draftCapabilities: (this.row.capabilities || []).slice(),
      draftRoles: (this.staffRoles || []).map(r => r.roleId),
      draftEmploymentNumber: this.row.employmentNumber || '',
      draftPayrollNumber: this.detail ? (this.detail.payrollNumber || '') : '',
      recordEndDate: false,
      endDate: '',
      newTerm: {
        effectiveFromDate: '',
        contractHoursPerWeek: '',
        employmentCategory: '',
        wageAmount: '',
        wageCurrency: '',
        wageInterval: ''
      }
    };
  },
  computed: {
    allCapabilities () { return CAPABILITIES; },
    personStateLabel () {
      return this.row.personState ? this.$i('wfr_person_' + String(this.row.personState).toLowerCase()) : this.$i('wfr_person_unknown');
    },
    capabilitiesChanged () {
      const before = (this.row.capabilities || []).slice().sort().join(',');
      return before !== this.draftCapabilities.slice().sort().join(',');
    },
    // The payroll number only ever arrives on the DETAIL read (`GET /staff` omits it), so a save is
    // offered only once that read has answered — otherwise an empty box would look like a value and
    // saving would blank a number nobody had seen.
    numbersChanged () {
      if (!this.detail) { return false; }
      return this.draftEmploymentNumber !== (this.row.employmentNumber || '') ||
        this.draftPayrollNumber !== (this.detail.payrollNumber || '');
    },
    rolesChanged () {
      const before = (this.staffRoles || []).map(r => r.roleId).slice().sort().join(',');
      return before !== this.draftRoles.slice().sort().join(',');
    },
    // Stripping WorkforceManager from the store's only remaining active manager is the same
    // one-way door as ending their engagement: capabilities are resolved ONLY from an active
    // engagement's grant bits, and no endpoint could grant them back afterwards.
    losingLastManager () {
      const held = (this.row.capabilities || []).includes(CAPABILITY_MANAGER);
      const keeping = this.draftCapabilities.includes(CAPABILITY_MANAGER);
      return this.row.isActive && held && !keeping && this.roster.activeManagerCount === 1;
    },
    openSessionLabel () {
      if (this.effects.openSessions === SESSIONS_UNKNOWN) { return this.$i('wfr_end_effect_punches_unknown'); }
      if (!this.effects.openSessions) { return this.$i('wfr_end_effect_punches_clear'); }
      return this.$i('wfr_end_effect_punches_open', { count: this.effects.openSessions });
    },
    openSessionClass () {
      if (this.effects.openSessions === SESSIONS_UNKNOWN) { return 'is-unknown'; }
      return this.effects.openSessions ? 'is-danger' : 'is-safe';
    },
    // A KNOWN open session blocks the button. An UNKNOWN one does not — refusing on an unanswered
    // check would make an unrelated 403 an unliftable block — but it is never allowed to render as
    // a clear either, which is what the label above does.
    blockedByOpenSession () {
      return this.effects.openSessions !== SESSIONS_UNKNOWN && this.effects.openSessions > 0;
    },
    reactivationCap () {
      return reactivationBlockedBy(this.row, this.asOf);
    }
  },
  watch: {
    // The panel is reused as the selection moves, so the drafts follow the row rather than keeping
    // the previous person's edits.
    'row.staffMemberId' () {
      this.draftCapabilities = (this.row.capabilities || []).slice();
      this.recordEndDate = false;
      this.endDate = '';
      this.newTerm = { effectiveFromDate: '', contractHoursPerWeek: '', employmentCategory: '', wageAmount: '', wageCurrency: '', wageInterval: '' };
    },
    staffRoles (value) {
      this.draftRoles = (value || []).map(r => r.roleId);
    },
    // The payroll number is only on the detail read, so the box fills in when that answers rather
    // than sitting empty and inviting a save that would blank it.
    detail (value) {
      this.draftPayrollNumber = value ? (value.payrollNumber || '') : '';
    }
  },
  methods: {
    orDash,
    short (capability) { return capability.replace('Workforce', '').toLowerCase(); },
    date (instant) { return formatDate(instant, this.timeZoneId, this.locale); },
    toggleCapability (capability) {
      const index = this.draftCapabilities.indexOf(capability);
      if (index === -1) { this.draftCapabilities.push(capability); } else { this.draftCapabilities.splice(index, 1); }
    },
    toggleRole (roleId) {
      const index = this.draftRoles.indexOf(roleId);
      if (index === -1) { this.draftRoles.push(roleId); } else { this.draftRoles.splice(index, 1); }
    },
    contractLabel (term) {
      const hours = contractHoursPerWeek(term.contractMinutesPerWeek);
      // A contract nobody recorded is a dash. Printing 0 would claim a zero-hour contract.
      return hours === null ? orDash(null) : this.$i('wfr_term_hours', { hours });
    },
    wageLabel (term) {
      if (term.wageState === WAGE_WITHHELD) { return this.$i('wfr_term_wage_withheld'); }
      if (term.wageState === WAGE_SET) { return term.wage.amount + ' ' + orDash(term.wage.currency); }
      return this.$i('wfr_term_wage_none');
    }
  }
};
</script>

<style scoped>
.wfr-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.wfr-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.wfr-panel__title { font-size: 1.15rem; font-weight: 600; color: #292c34; margin: 0; }
.wfr-panel__sub { margin: 2px 0 0; color: #64748b; font-size: 0.78rem; }
.wfr-panel__close { border: none; background: none; font-size: 1.5rem; line-height: 1; color: #94a3b8; cursor: pointer; }

.wfr-panel__facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 16px 0 0; font-size: 0.82rem; }
.wfr-panel__facts dt { color: #94a3b8; font-weight: 600; }
.wfr-panel__facts dd { margin: 0; color: #292c34; }
.wfr-panel__facts dd.is-unknown { color: #94a3b8; font-style: italic; }
.wfr-panel__facts dd.is-mono { font-family: monospace; font-size: 0.74rem; word-break: break-all; }

.wfr-panel__note { margin: 12px 0 0; color: #64748b; font-size: 0.78rem; }

.wfr-panel__section { margin-top: 22px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.wfr-panel__section h3 { font-size: 0.94rem; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.wfr-panel__hint { margin: 0 0 10px; color: #64748b; font-size: 0.78rem; }
.wfr-panel__unknown { margin: 0; padding: 10px 14px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #cbd5e0; color: #94a3b8; font-size: 0.8rem; }
.wfr-panel__unknown.is-answered { border-style: solid; border-color: #e2e8f0; color: #64748b; }

.wfr-panel__caps, .wfr-panel__roles { display: flex; flex-direction: column; gap: 6px; }
.wfr-panel__cap, .wfr-panel__role { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; padding: 7px 10px; background: #f8f9fa; border-radius: 8px; font-size: 0.84rem; color: #292c34; cursor: pointer; }
.wfr-panel__cap small, .wfr-panel__role small { grid-column: 2; color: #64748b; font-size: 0.72rem; }
.wfr-panel__role small.is-retired { color: #92400e; }

.wfr-panel__terms { list-style: none; margin: 0; padding: 0; }
.wfr-panel__terms li { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 8px; background: #f8f9fa; margin-bottom: 6px; font-size: 0.8rem; }
.wfr-panel__terms li.is-open { background: rgba(27, 183, 118, 0.08); }
.wfr-panel__term-dates { font-weight: 600; color: #292c34; }
.wfr-panel__term-fact { color: #64748b; }
.wfr-panel__term-fact.is-wage-withheld { color: #94a3b8; font-style: italic; }
.wfr-panel__termform { margin-top: 10px; }
.wfr-panel__sublabel { display: block; margin-bottom: 6px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
.wfr-panel__termgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 6px; }
.wfr-panel__termgrid--pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.wfr-panel__section--end { border-top-color: #fde68a; }
.wfr-panel__effects { list-style: none; margin: 0 0 14px; padding: 0; font-size: 0.8rem; }
.wfr-panel__effects li { padding: 7px 12px; border-radius: 8px; background: #f8f9fa; color: #64748b; margin-bottom: 5px; }
.wfr-panel__effects li.is-safe { background: rgba(27, 183, 118, 0.08); color: #159f63; }
.wfr-panel__effects li.is-unknown { background: #fff; border: 1px dashed #cbd5e0; color: #94a3b8; }
.wfr-panel__effects li.is-danger { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }

.wfr-panel__endcheck { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #292c34; margin-bottom: 8px; }
.wfr-panel__input { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.86rem; }
.wfr-panel__danger { margin: 10px 0; padding: 10px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; font-size: 0.8rem; }

.wfr-panel__btn { margin-top: 12px; border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.86rem; }
.wfr-panel__btn--danger { background: #fff; color: #ef4444; border: 1px solid #ef4444; }
.wfr-panel__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }
</style>
