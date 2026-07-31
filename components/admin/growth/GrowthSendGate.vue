<template>
  <section class="growth-gate" :class="'growth-gate--' + gate.state">
    <header class="growth-gate__head">
      <h2 class="growth-gate__title">
        {{ $i('growth_gate_title') }}
      </h2>
      <span class="growth-gate__badge" :class="'growth-gate__badge--' + gate.state">
        {{ $i('growth_gate_state_' + gate.state) }}
      </span>
    </header>

    <p class="growth-gate__intro">
      {{ $i('growth_gate_intro') }}
    </p>

    <!-- Every refusal, not just the first. An operator who fixes the one thing they were shown and
         finds another refusal behind it learns to distrust the surface. -->
    <ul v-if="reasons.length" class="growth-gate__reasons">
      <li
        v-for="reason in reasons"
        :key="reason.code"
        class="growth-gate__reason"
        :class="'growth-gate__reason--' + reason.kind"
      >
        <span class="growth-gate__mark">{{ reason.kind === 'unknown' ? '?' : '×' }}</span>
        <span>{{ $i(labelFor(reason.code)) }}</span>
      </li>
    </ul>

    <div class="growth-gate__recipients">
      <span class="growth-gate__recipients-label">{{ $i('growth_gate_recipients') }}</span>
      <!-- Null when no audience has been computed. It is a dash, never a 0, and it is never derived
           from the consent standing — a count an operator would act on is only ever the snapshot's. -->
      <strong :class="{ 'is-unknown': gate.recipientCount === null }">
        {{ gate.recipientCount === null ? unknownMark : gate.recipientCount }}
      </strong>
    </div>

    <!-- WHAT MAIL PATH THIS STORE HAS, as the API reports it — and, in the same breath, what the API
         does not report. The provider-account list is provisioning; the running mail adapter is a
         server-side binding no endpoint exposes, so the note names that limit instead of letting an
         empty list be read as "this is a stub" or a full one as "this is real mail". -->
    <div class="growth-gate__mail">
      <span class="growth-gate__mail-label">{{ $i('growth_gate_mail_path') }}</span>
      <p v-if="mailPath.state !== 'read'" class="growth-gate__mail-value is-unknown">
        {{ $i('growth_gate_mail_unknown') }}
      </p>
      <p v-else-if="!mailPath.providers.length" class="growth-gate__mail-value">
        {{ $i('growth_gate_mail_none') }}
      </p>
      <ul v-else class="growth-gate__mail-list">
        <li v-for="provider in mailPath.providers" :key="provider.providerKey">
          <span>{{ provider.providerKey }}</span>
          <span class="growth-gate__mail-domain">{{ provider.sendingDomain || unknownMark }}</span>
          <span v-if="provider.paused" class="growth-gate__mail-paused">
            {{ $i('growth_gate_mail_paused') }}
          </span>
        </li>
      </ul>
      <p class="growth-gate__note">
        {{ $i('growth_gate_mail_binding_note') }}
      </p>
    </div>

    <button
      type="button"
      class="growth-gate__send"
      :disabled="!canSend"
      @click="$emit('send')"
    >
      {{ busy ? $i('growth_gate_sending') : $i('growth_gate_send') }}
    </button>

    <!-- READY is "nothing we can see refuses this", never "this will send". One precondition is
         invisible from a browser (the deployment-wide `Growth:Enabled` switch), so the badge is
         qualified in words rather than left to imply the stronger claim. -->
    <p v-if="gate.state === 'ready'" class="growth-gate__note">
      {{ $i('growth_gate_ready_caveat') }}
    </p>

    <p v-if="gate.state === 'dispatched'" class="growth-gate__note">
      {{ $i('growth_gate_dispatched_note') }}
    </p>
  </section>
</template>

<script>
import {
  GATE_READY,
  BLOCK_CONSENT_UNREADABLE,
  BLOCK_NO_AUDIENCE,
  BLOCK_EMPTY_AUDIENCE,
  BLOCK_NO_CONTENT,
  BLOCK_NOT_APPROVED,
  BLOCK_APPROVAL_SUPERSEDED,
  BLOCK_NO_UNSUBSCRIBE,
  BLOCK_MODULE_OFF,
  BLOCK_DISPATCH_OFF,
  BLOCK_PROVIDER_PAUSED,
  BLOCK_PLATFORM_UNREADABLE
} from '~/utils/growth/send-gate';

// Rendering keys on the gate's stable codes, never on prose. A code with no entry here would render
// its own code rather than silently disappearing, which is the failure mode worth having.
const LABELS = {
  [BLOCK_CONSENT_UNREADABLE]: 'growth_block_consent_unreadable',
  [BLOCK_NO_AUDIENCE]: 'growth_block_no_audience',
  [BLOCK_EMPTY_AUDIENCE]: 'growth_block_empty_audience',
  [BLOCK_NO_CONTENT]: 'growth_block_no_content',
  [BLOCK_NOT_APPROVED]: 'growth_block_not_approved',
  [BLOCK_APPROVAL_SUPERSEDED]: 'growth_block_approval_superseded',
  [BLOCK_NO_UNSUBSCRIBE]: 'growth_block_no_unsubscribe',
  [BLOCK_MODULE_OFF]: 'growth_block_module_off',
  [BLOCK_DISPATCH_OFF]: 'growth_block_dispatch_off',
  [BLOCK_PROVIDER_PAUSED]: 'growth_block_provider_paused',
  [BLOCK_PLATFORM_UNREADABLE]: 'growth_block_platform_unreadable'
};

/**
 * The enforcement point: the ONE place a dispatch can be started, and the reasons it cannot.
 *
 * The button is bound to `gate.state === 'ready'` and to nothing else. There is no second path to
 * `$emit('send')` — no keyboard shortcut, no form submit, no "send anyway" — because the whole
 * value of the gate is that it cannot be walked around.
 *
 * The two refusal kinds are drawn differently on purpose. `unknown` means a read did not answer, so
 * nothing is known; `blocked` means everything answered and a condition genuinely refuses. Both stop
 * the send, but they ask the operator for different next steps.
 */
export default {
  name: 'GrowthSendGate',
  props: {
    /** The `resolveSendGate` outcome. */
    gate: { type: Object, required: true },
    /** The `readMailPath` projection — the store's provisioned provider accounts, or unknown. */
    mailPath: { type: Object, default: () => ({ state: 'unknown', providers: [], anyPaused: null }) },
    /** A dispatch is in flight. */
    busy: { type: Boolean, default: false }
  },
  data () {
    return { unknownMark: '—' };
  },
  computed: {
    // The single condition. `busy` additionally holds the button, so a double-click cannot fire a
    // second dispatch while the first is still open.
    canSend () {
      return this.gate.state === GATE_READY && !this.busy;
    },
    reasons () {
      const unknown = (this.gate.unknown || []).map(code => ({ code, kind: 'unknown' }));
      const blocked = (this.gate.blocked || []).map(code => ({ code, kind: 'blocked' }));
      return unknown.concat(blocked);
    }
  },
  methods: {
    labelFor (code) {
      return LABELS[code] || code;
    }
  }
};
</script>

<style scoped>
.growth-gate { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; }
.growth-gate--ready { border-color: #bbf7d0; background: #f0fdf4; }
.growth-gate--blocked { border-color: #fecaca; background: #fef2f2; }
.growth-gate--unknown { border-color: #fde68a; background: #fffbeb; }
.growth-gate__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
.growth-gate__title { font-size: 16px; font-weight: 600; color: #292c34; margin: 0; }
.growth-gate__badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; border-radius: 999px; padding: 4px 10px; }
.growth-gate__badge--ready { background: #1bb776; color: #fff; }
.growth-gate__badge--blocked { background: #ef4444; color: #fff; }
.growth-gate__badge--unknown { background: #fde68a; color: #92400e; }
.growth-gate__badge--dispatched { background: #e2e8f0; color: #64748b; }
.growth-gate__intro { font-size: 13px; color: #64748b; margin: 0 0 16px; line-height: 1.5; }
.growth-gate__reasons { list-style: none; margin: 0 0 16px; padding: 0; }
.growth-gate__reason { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 6px 0; line-height: 1.5; }
.growth-gate__reason--blocked { color: #b91c1c; }
.growth-gate__reason--unknown { color: #92400e; }
.growth-gate__mark { font-weight: 700; flex: 0 0 auto; width: 14px; }
.growth-gate__recipients { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 16px; }
.growth-gate__recipients-label { font-size: 13px; color: #64748b; }
.growth-gate__recipients strong { font-size: 22px; color: #292c34; font-variant-numeric: tabular-nums; }
.growth-gate__recipients strong.is-unknown { color: #94a3b8; font-weight: 400; }
.growth-gate__mail { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 16px; }
.growth-gate__mail-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 6px; }
.growth-gate__mail-value { font-size: 13px; color: #292c34; margin: 0; }
.growth-gate__mail-value.is-unknown { color: #94a3b8; }
.growth-gate__mail-list { list-style: none; margin: 0; padding: 0; }
.growth-gate__mail-list li { display: flex; gap: 8px; align-items: baseline; font-size: 13px; color: #292c34; padding: 2px 0; }
.growth-gate__mail-domain { color: #64748b; }
.growth-gate__mail-paused { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; background: #fde68a; color: #92400e; border-radius: 999px; padding: 2px 8px; }
.growth-gate__send { width: 100%; border: 0; border-radius: 8px; background: #1bb776; color: #fff; padding: 12px 16px; font-size: 14px; font-weight: 600; cursor: pointer; }
.growth-gate__send:hover:not(:disabled) { background: #159f63; }
.growth-gate__send:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
.growth-gate__note { font-size: 12px; color: #64748b; margin: 12px 0 0; line-height: 1.5; }
</style>
