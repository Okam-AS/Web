<template>
  <form class="wfr-add" @submit.prevent="submit">
    <h2 class="wfr-add__title">
      {{ $i('wfr_add_title') }}
    </h2>

    <!-- WHO. A person is a chain-wide human; an engagement is that human's employment at THIS
         store. Adding someone therefore asks which of the two is new — and the "already here"
         option can only offer people this store already knows, because no route on this surface
         searches for a person and one that did would disclose that they exist somewhere else. -->
    <div class="wfr-add__modes">
      <label>
        <input v-model="mode" type="radio" value="new"> {{ $i('wfr_add_mode_new') }}
      </label>
      <label>
        <input v-model="mode" type="radio" value="existing" :disabled="!people.length"> {{ $i('wfr_add_mode_existing') }}
      </label>
    </div>
    <p class="wfr-add__hint">
      {{ mode === 'new' ? $i('wfr_add_mode_new_hint') : $i('wfr_add_mode_existing_hint') }}
    </p>

    <template v-if="mode === 'new'">
      <label class="wfr-add__label">{{ $i('wfr_add_display_name') }}</label>
      <input v-model.trim="displayName" class="wfr-add__input" type="text" :placeholder="$i('wfr_add_display_name')">

      <div class="wfr-add__pair">
        <div>
          <label class="wfr-add__label">{{ $i('wfr_add_email') }}</label>
          <input v-model.trim="contactEmail" class="wfr-add__input" type="email">
        </div>
        <div>
          <label class="wfr-add__label">{{ $i('wfr_add_phone') }}</label>
          <input v-model.trim="contactPhone" class="wfr-add__input" type="tel">
        </div>
      </div>
    </template>

    <template v-else>
      <label class="wfr-add__label">{{ $i('wfr_add_person') }}</label>
      <select v-model="workforcePersonId" class="wfr-add__input">
        <option :value="null">
          {{ $i('wfr_add_person_choose') }}
        </option>
        <!-- A blocked person stays visible with the reason. Dropping them would read as "we have
             never heard of this person", which is a different and wrong sentence. -->
        <option
          v-for="person in people"
          :key="person.workforcePersonId"
          :value="person.workforcePersonId"
          :disabled="person.blocked"
        >
          {{ person.displayName || person.workforcePersonId }}{{ person.blocked ? ' — ' + $i('wfr_add_person_blocked') : '' }}
        </option>
      </select>
    </template>

    <!-- THE LEGAL EMPLOYER. Required by the endpoint, and unnamed by every endpoint: nothing on
         this surface returns a legal employer's name or organization number, so the only honest
         label is the id plus how many of this store's engagements sit under it. -->
    <label class="wfr-add__label">{{ $i('wfr_add_employer') }}</label>
    <select v-if="employers.length > 1" v-model="legalEmployerId" class="wfr-add__input">
      <option v-for="employer in employers" :key="employer.legalEmployerId" :value="employer.legalEmployerId">
        {{ employer.legalEmployerId }} ({{ $i('wfr_add_employer_count', { count: employer.activeCount }) }})
      </option>
    </select>
    <p v-else-if="employers.length === 1" class="wfr-add__fixed">
      {{ employers[0].legalEmployerId }}
    </p>
    <p v-else class="wfr-add__blocker">
      {{ $i('wfr_add_no_employer') }}
    </p>
    <p class="wfr-add__hint">
      {{ $i('wfr_add_employer_hint') }}
    </p>

    <!-- CAPABILITIES. What this engagement may DO — the only thing in the module that authorises
         anything. Job roles are set separately and grant nothing, which the label says. -->
    <label class="wfr-add__label">{{ $i('wfr_add_capabilities') }}</label>
    <div class="wfr-add__caps">
      <label v-for="capability in allCapabilities" :key="capability" class="wfr-add__cap">
        <input v-model="capabilities" type="checkbox" :value="capability">
        <span>{{ $i('wfr_cap_' + capability.replace('Workforce', '').toLowerCase()) }}</span>
        <small>{{ $i('wfr_cap_desc_' + capability.replace('Workforce', '').toLowerCase()) }}</small>
      </label>
    </div>

    <div class="wfr-add__pair">
      <div>
        <label class="wfr-add__label">{{ $i('wfr_add_employment_number') }}</label>
        <input v-model.trim="employmentNumber" class="wfr-add__input" type="text">
      </div>
      <div>
        <label class="wfr-add__label">{{ $i('wfr_add_payroll_number') }}</label>
        <input v-model.trim="payrollNumber" class="wfr-add__input" type="text">
      </div>
    </div>

    <label class="wfr-add__label">{{ $i('wfr_add_active_from') }}</label>
    <input v-model="activeFromDate" class="wfr-add__input" type="date">

    <!-- The half of the unique index this screen CAN see. Same store, so naming the engagement is
         not a leak — the manager is looking at it in the table behind this panel. -->
    <p v-if="conflict" class="wfr-add__blocker">
      {{ $i('wfr_conflict_same_store') }}
    </p>
    <!-- And the half it cannot. Said before the attempt rather than after the 409, because the
         refusal names nothing and a manager who has not been told why will read it as a bug. -->
    <p v-else-if="mode === 'existing' && workforcePersonId" class="wfr-add__hint">
      {{ $i('wfr_conflict_cross_store_caveat') }}
    </p>

    <div class="wfr-add__actions">
      <button class="wfr-add__btn wfr-add__btn--ghost" type="button" :disabled="busy" @click="$emit('cancel')">
        {{ $i('wfr_cancel') }}
      </button>
      <button class="wfr-add__btn" type="submit" :disabled="busy || !canSubmit">
        {{ $i('wfr_add_submit') }}
      </button>
    </div>
  </form>
</template>

<script>
import { CAPABILITIES, activeEngagementConflict, legalEmployerOptions, personOptions } from '~/utils/workforce/roster';

// Adding someone to a store. The form asks for an ENGAGEMENT; whether a person is created along
// with it is a consequence of which mode is chosen, not a separate step.
//
// It refuses locally what it can prove will be refused server-side — a second active engagement for
// the same (person, legal employer) — and says plainly that it cannot prove the rest, because the
// index spans every store and the other stores are invisible here by design.
export default {
  name: 'WorkforceAddPersonForm',
  props: {
    roster: { type: Object, required: true },
    busy: { type: Boolean, default: false }
  },
  data () {
    return {
      mode: 'new',
      displayName: '',
      contactEmail: '',
      contactPhone: '',
      workforcePersonId: null,
      legalEmployerId: null,
      capabilities: ['WorkforceSelf'],
      employmentNumber: '',
      payrollNumber: '',
      activeFromDate: ''
    };
  },
  computed: {
    allCapabilities () { return CAPABILITIES; },
    employers () { return legalEmployerOptions(this.roster.rows || []); },
    people () { return personOptions(this.roster.rows || [], this.legalEmployerId); },
    conflict () {
      if (this.mode !== 'existing') { return null; }
      return activeEngagementConflict(this.roster.rows || [], this.workforcePersonId, this.legalEmployerId, null);
    },
    canSubmit () {
      if (!this.legalEmployerId || this.conflict) { return false; }
      return this.mode === 'new' ? !!this.displayName : !!this.workforcePersonId;
    }
  },
  created () {
    // One legal employer is the normal case for a store, so it is chosen rather than made a
    // ceremony. Several is not — the manager picks, because the ids carry no name to guess from.
    if (this.employers.length) { this.legalEmployerId = this.employers[0].legalEmployerId; }
  },
  methods: {
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('submit', {
        workforcePersonId: this.mode === 'existing' ? this.workforcePersonId : null,
        displayName: this.displayName,
        contactEmail: this.contactEmail,
        contactPhone: this.contactPhone,
        legalEmployerId: this.legalEmployerId,
        capabilities: this.capabilities,
        employmentNumber: this.employmentNumber,
        payrollNumber: this.payrollNumber,
        activeFromDate: this.activeFromDate
      });
    }
  }
};
</script>

<style scoped>
.wfr-add { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.wfr-add__title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 14px; }
.wfr-add__modes { display: flex; gap: 18px; font-size: 0.86rem; color: #292c34; }
.wfr-add__label { display: block; margin: 14px 0 6px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #292c34; }
.wfr-add__input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.wfr-add__input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
.wfr-add__pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.wfr-add__fixed { margin: 0; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8f9fa; color: #64748b; font-size: 0.8rem; font-family: monospace; word-break: break-all; }
.wfr-add__hint { margin: 6px 0 0; color: #64748b; font-size: 0.78rem; }
.wfr-add__blocker { margin: 10px 0 0; padding: 10px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; font-size: 0.82rem; }
.wfr-add__caps { display: flex; flex-direction: column; gap: 8px; }
.wfr-add__cap { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; font-size: 0.86rem; color: #292c34; cursor: pointer; }
.wfr-add__cap small { grid-column: 2; color: #64748b; font-size: 0.74rem; }
.wfr-add__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.wfr-add__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wfr-add__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wfr-add__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }
</style>
