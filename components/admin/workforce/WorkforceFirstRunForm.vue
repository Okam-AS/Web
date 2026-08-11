<template>
  <form class="wfr-first" data-wfr-first-run @submit.prevent="submit">
    <h2 class="wfr-first__title">
      {{ $i('wfr_first_title') }}
    </h2>
    <p class="wfr-first__intro">
      {{ $i('wfr_first_intro') }}
    </p>

    <label class="wfr-first__label">{{ $i('wfr_first_employer_name') }}</label>
    <input v-model.trim="legalEmployerName" class="wfr-first__input" type="text" data-wfr-first-employer :placeholder="$i('wfr_emp_name_placeholder')">

    <label class="wfr-first__label">{{ $i('wfr_first_orgnr') }}</label>
    <input v-model.trim="organizationNumber" class="wfr-first__input" type="text" data-wfr-first-orgnr :placeholder="$i('wfr_emp_orgnr_placeholder')">
    <p class="wfr-first__hint">
      {{ $i('wfr_emp_orgnr_hint') }}
    </p>

    <label class="wfr-first__label">{{ $i('wfr_first_your_name') }}</label>
    <input v-model.trim="displayName" class="wfr-first__input" type="text" data-wfr-first-name :placeholder="$i('wfr_first_your_name_placeholder')">
    <!-- Not "who should manage this" — the endpoint takes no subject and mints the engagement for
         whoever calls it. Saying so here is what stops an owner typing their bookkeeper's name and
         wondering why the bookkeeper still cannot sign in. -->
    <p class="wfr-first__hint">
      {{ $i('wfr_first_your_name_hint') }}
    </p>

    <!-- THE CONSEQUENCE, stated where the decision is made. Creating the first engagement switches
         the Workforce module on for this store whatever this checkbox says — the gate grandfathers
         any store that has one — so the honest design is not to hide the activation but to refuse to
         perform it unless the operator has read what it does. The server refuses an unconfirmed
         request for the same reason, so this is a rendering of a rule rather than the rule itself. -->
    <div v-if="willActivateModule" class="wfr-first__consent" data-wfr-first-consent>
      <label class="wfr-first__consent-row">
        <input v-model="confirmModuleActivation" type="checkbox" data-wfr-first-confirm>
        <span>{{ $i('wfr_first_activate_label') }}</span>
      </label>
      <p class="wfr-first__consent-detail">
        {{ $i('wfr_first_activate_detail') }}
      </p>
    </div>
    <p v-else class="wfr-first__already-on" data-wfr-first-already-on>
      {{ $i('wfr_first_activate_already') }}
    </p>

    <div class="wfr-first__actions">
      <button class="wfr-first__btn" type="submit" data-wfr-first-submit :disabled="busy || !canSubmit">
        {{ $i('wfr_first_submit') }}
      </button>
    </div>
  </form>
</template>

<script>
// The store's FIRST RUN on Workforce: register the legal employer and mint the first engagement.
//
// It is a different form from "register an employer" and from "add a person" even though it collects
// the same three fields, and that is deliberate. Those two are roster operations performed by
// somebody who already holds a Workforce capability; this is the one act that happens BEFORE anybody
// holds one, it is available only to a store administrator, and it happens exactly once per store.
// Folding it into the roster forms would put a one-time privileged act behind a button that looks
// like every other button on the page.
//
// The form never decides who is admitted. There is no name-of-person-to-engage field because the
// endpoint takes no subject: it engages the caller. What the operator chooses here is the company
// their staff are employed by, the name they will appear under, and whether to switch the module on.
export default {
  name: 'WorkforceFirstRunForm',
  props: {
    /** The server's own answer: `{ isOpen, storeHasWorkforceStaff, moduleEnabled, moduleWillBeActivated }`. */
    status: { type: Object, required: true },
    busy: { type: Boolean, default: false }
  },
  data () {
    return {
      legalEmployerName: '',
      organizationNumber: '',
      displayName: '',
      confirmModuleActivation: false
    };
  },
  computed: {
    // Read off the SERVER's status rather than inferred from anything local. Whether this act turns
    // a module on is a fact about the store, and the one place that knows it is the gate.
    willActivateModule () {
      return !!this.status.moduleWillBeActivated;
    },
    canSubmit () {
      // A module that is already on cannot be switched on, so there is nothing to consent to and
      // demanding consent would be theatre — the kind that teaches people to tick boxes without
      // reading them. The request still carries `confirmModuleActivation: true` (see `submit`); what
      // varies is whether the operator is asked to agree to something that is actually happening.
      const consented = this.confirmModuleActivation || !this.willActivateModule;
      return !!this.legalEmployerName &&
        !!this.organizationNumber &&
        !!this.displayName &&
        consented;
    }
  },
  methods: {
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('submit', {
        confirmModuleActivation: true,
        organizationNumber: this.organizationNumber,
        legalEmployerName: this.legalEmployerName,
        displayName: this.displayName
      });
    }
  }
};
</script>

<style scoped>
.wfr-first { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); max-width: 560px; }
.wfr-first__title { font-size: 1.15rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfr-first__intro { margin: 0 0 8px; color: #64748b; font-size: 0.86rem; line-height: 1.5; }
.wfr-first__label { display: block; margin: 16px 0 6px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #292c34; }
.wfr-first__input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.wfr-first__input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
.wfr-first__hint { margin: 6px 0 0; color: #64748b; font-size: 0.78rem; }
.wfr-first__consent { margin: 20px 0 0; padding: 14px 16px; border-radius: 10px; background: #fffbeb; border: 1px solid #fde68a; }
.wfr-first__consent-row { display: flex; align-items: flex-start; gap: 10px; font-size: 0.86rem; color: #292c34; font-weight: 600; }
.wfr-first__consent-detail { margin: 8px 0 0 26px; color: #78716c; font-size: 0.79rem; line-height: 1.5; }
.wfr-first__already-on { margin: 20px 0 0; padding: 10px 14px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; font-size: 0.8rem; }
.wfr-first__actions { display: flex; justify-content: flex-end; margin-top: 20px; }
.wfr-first__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wfr-first__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; }
</style>
