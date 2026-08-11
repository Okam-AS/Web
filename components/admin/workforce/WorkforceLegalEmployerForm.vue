<template>
  <form class="wfr-emp" @submit.prevent="submit">
    <h2 class="wfr-emp__title">
      {{ $i('wfr_emp_title') }}
    </h2>
    <p class="wfr-emp__intro">
      {{ $i('wfr_emp_intro') }}
    </p>

    <label class="wfr-emp__label">{{ $i('wfr_emp_name') }}</label>
    <input v-model.trim="name" class="wfr-emp__input" type="text" data-wfr-emp-name :placeholder="$i('wfr_emp_name_placeholder')">

    <label class="wfr-emp__label">{{ $i('wfr_emp_orgnr') }}</label>
    <input v-model.trim="organizationNumber" class="wfr-emp__input" type="text" data-wfr-emp-orgnr :placeholder="$i('wfr_emp_orgnr_placeholder')">
    <p class="wfr-emp__hint">
      {{ $i('wfr_emp_orgnr_hint') }}
    </p>

    <!-- The registered set, shown INSIDE the form rather than only behind it. A manager about to type
         an organization number is exactly the person who needs to see that it is already registered,
         and the server's refusal — which names the existing row — arrives too late to prevent the
         typing. Three states, never two: a read that failed must not read as "this store has none". -->
    <p v-if="employers.state === 'unknown'" class="wfr-emp__unknown" data-wfr-emp-unknown>
      {{ $i('wfr_emp_existing_unknown') }}
    </p>
    <p v-else-if="employers.state === 'empty'" class="wfr-emp__none" data-wfr-emp-none>
      {{ $i('wfr_emp_existing_none') }}
    </p>
    <ul v-else class="wfr-emp__existing" data-wfr-emp-existing>
      <li v-for="employer in employers.rows" :key="employer.legalEmployerId">
        <span class="wfr-emp__existing-name">{{ employer.name || $i('wfr_emp_unnamed') }}</span>
        <span class="wfr-emp__existing-org">{{ employer.organizationNumber || dash }}</span>
      </li>
    </ul>

    <div class="wfr-emp__actions">
      <button class="wfr-emp__btn wfr-emp__btn--ghost" type="button" :disabled="busy" @click="$emit('cancel')">
        {{ $i('wfr_cancel') }}
      </button>
      <button class="wfr-emp__btn" type="submit" data-wfr-emp-submit :disabled="busy || !canSubmit">
        {{ $i('wfr_emp_submit') }}
      </button>
    </div>
  </form>
</template>

<script>
// Registering the legal entity a store's staff are employed by.
//
// It is a separate form from "add a person" for the same reason the role catalogue is a separate
// page: a roster that quietly created a company because a manager typed something into a hiring form
// would make the employer list unownable, and the employer is the one identifier in this module that
// a compliance rule keys on. Registering is deliberate here; hiring picks from what exists.
//
// The form asks for exactly what the endpoint stores and nothing more. There is no effective-from
// field: an employer is registered as existing now, and back-dating it would be a claim about when a
// company came into being that nobody typing into this box is in a position to make.
export default {
  name: 'WorkforceLegalEmployerForm',
  props: {
    employers: { type: Object, required: true },
    busy: { type: Boolean, default: false }
  },
  data () {
    return {
      name: '',
      organizationNumber: '',
      dash: '—'
    };
  },
  computed: {
    canSubmit () {
      return !!this.name && !!this.organizationNumber;
    }
  },
  methods: {
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('submit', { name: this.name, organizationNumber: this.organizationNumber });
    }
  }
};
</script>

<style scoped>
.wfr-emp { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.wfr-emp__title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfr-emp__intro { margin: 0 0 8px; color: #64748b; font-size: 0.84rem; }
.wfr-emp__label { display: block; margin: 14px 0 6px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #292c34; }
.wfr-emp__input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.wfr-emp__input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
.wfr-emp__hint { margin: 6px 0 0; color: #64748b; font-size: 0.78rem; }
.wfr-emp__unknown, .wfr-emp__none { margin: 14px 0 0; padding: 10px 14px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; font-size: 0.8rem; }
.wfr-emp__existing { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.wfr-emp__existing li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; font-size: 0.82rem; }
.wfr-emp__existing-name { color: #292c34; }
.wfr-emp__existing-org { color: #64748b; font-family: monospace; }
.wfr-emp__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.wfr-emp__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wfr-emp__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wfr-emp__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }
</style>
