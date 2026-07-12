<template>
  <div class="eod" @click.self="maybeClose">
    <div class="eod__panel">
      <header class="eod__head">
        <h2 class="eod__title">
          {{ step === 'result' ? $i('pos_eod_done_title') : $i('pos_eod_title') }}
        </h2>
        <button v-if="step !== 'result'" type="button" class="eod__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="eod__body">
        <!-- Step 1: count -->
        <template v-if="step === 'count'">
          <div class="eod__expected">
            <span>{{ $i('pos_report_cash_expected') }}</span>
            <strong>{{ priceLabel(expectedCash) }}</strong>
          </div>
          <label class="eod__label">{{ $i('pos_eod_counted') }}</label>
          <AmountPad v-model="counted" />
          <div class="eod__diff" :class="{ 'is-off': explanationRequired }">
            <span>{{ $i('pos_report_cash_diff') }}</span>
            <strong>{{ priceLabel(diff) }}</strong>
          </div>
          <template v-if="explanationRequired">
            <label class="eod__label">{{ $i('pos_eod_explanation') }}</label>
            <textarea v-model="explanation" class="eod__textarea" :placeholder="$i('pos_eod_explanation_ph')" />
          </template>
        </template>

        <!-- Step 2: deposit + email -->
        <template v-else-if="step === 'deposit'">
          <label class="eod__label">{{ $i('pos_eod_bank_deposit') }}</label>
          <AmountPad v-model="bankDeposit" />
          <label class="eod__label">{{ $i('pos_eod_email') }}</label>
          <input v-model="email" type="email" class="eod__input" :placeholder="$i('pos_eod_email_ph')">
          <p v-if="error" class="eod__error">
            {{ error }}
          </p>
        </template>

        <!-- Result -->
        <template v-else-if="step === 'result'">
          <div class="eod__result">
            <div class="eod__result-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p class="eod__result-text">
              {{ $i('pos_eod_result_hint') }}
            </p>
            <div class="eod__result-rows">
              <div class="eod__row">
                <span>{{ $i('pos_report_cash_expected') }}</span><span>{{ priceLabel(result.expectedCashAmount) }}</span>
              </div>
              <div class="eod__row">
                <span>{{ $i('pos_report_cash_counted') }}</span><span>{{ priceLabel(result.countedAmount) }}</span>
              </div>
              <div class="eod__row" :class="{ 'eod__row--off': result.difference }">
                <span>{{ $i('pos_report_cash_diff') }}</span><span>{{ priceLabel(result.difference) }}</span>
              </div>
              <div class="eod__row">
                <span>{{ $i('pos_report_bank_deposit') }}</span><span>{{ priceLabel(result.bankDepositAmount) }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <footer class="eod__foot">
        <button v-if="step === 'count'" type="button" class="eod__primary" :disabled="!canProceedCount" @click="step = 'deposit'">
          {{ $i('common_next') }}
        </button>
        <template v-else-if="step === 'deposit'">
          <button type="button" class="eod__ghost" @click="step = 'count'">
            {{ $i('pos_back') }}
          </button>
          <button type="button" class="eod__primary" :disabled="busy" @click="submit">
            <span v-if="busy">{{ $i('pos_working') }}</span>
            <span v-else>{{ $i('pos_eod_close_day') }}</span>
          </button>
        </template>
        <button v-else-if="step === 'result'" type="button" class="eod__primary" @click="$emit('done')">
          {{ $i('common_done') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// End-of-day wizard: count the drawer (live difference vs expected), require an explanation when the
// difference exceeds the cash point's limit, record the bank deposit and email, then close the day.
// end-day generates the signed Z report and emails the EOD receipt server-side.
export default {
  name: 'EodWizard',
  components: { AmountPad },
  inject: ['pos'],
  props: {
    sessionId: { type: Number, required: true },
    expectedCash: { type: Number, default: 0 },
    maxDifference: { type: Number, default: 0 },
    defaultEmail: { type: String, default: '' }
  },
  data () {
    return {
      step: 'count',
      counted: 0,
      bankDeposit: 0,
      explanation: '',
      email: this.defaultEmail,
      busy: false,
      error: '',
      result: null
    };
  },
  computed: {
    diff () { return this.counted - this.expectedCash; },
    explanationRequired () { return Math.abs(this.diff) > this.maxDifference; },
    canProceedCount () { return !this.explanationRequired || this.explanation.trim().length > 0; }
  },
  methods: {
    maybeClose () {
      if (this.step !== 'result' && !this.busy) { this.$emit('close'); }
    },
    async submit () {
      this.busy = true;
      this.error = '';
      try {
        this.result = await this.pos.drawerSvc().EndDay(this.sessionId, {
          endCountedAmount: this.counted,
          bankDepositAmount: this.bankDeposit,
          differenceExplanation: this.explanation ? this.explanation.trim() : null,
          email: this.email || null
        });
        this.step = 'result';
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.eod {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}
.eod__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.eod__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.eod__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.eod__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.eod__close svg { width: 24px; height: 24px; }

.eod__body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.eod__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.eod__input { width: 100%; height: 46px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 1rem; color: var(--pos-ink, #292c34); }
.eod__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.eod__textarea { width: 100%; min-height: 70px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; font-size: 0.95rem; font-family: inherit; color: var(--pos-ink, #292c34); resize: vertical; }
.eod__textarea:focus { outline: none; border-color: var(--pos-primary, #1bb776); }

.eod__expected, .eod__diff {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 12px;
}
.eod__diff { margin-top: 12px; }
.eod__diff.is-off { background: rgba(239, 68, 68, 0.08); border-color: #ef4444; }
.eod__diff.is-off strong { color: #ef4444; }
.eod__expected strong, .eod__diff strong { font-size: 1.2rem; }

.eod__error { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin: 12px 0 0; }

.eod__result { text-align: center; }
.eod__result-icon { width: 60px; height: 60px; border-radius: 50%; background: rgba(27, 183, 118, 0.14); color: var(--pos-primary-dark, #159f63); display: flex; align-items: center; justify-content: center; margin: 4px auto 14px; }
.eod__result-icon svg { width: 34px; height: 34px; }
.eod__result-text { color: #64748b; margin: 0 0 16px; }
.eod__result-rows { text-align: left; }
.eod__row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
.eod__row--off span:last-child { color: #ef4444; font-weight: 700; }

.eod__foot { display: flex; gap: 10px; padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.eod__primary { flex: 1; height: 54px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.eod__primary:disabled { background: #cbd5e0; cursor: not-allowed; }
.eod__ghost { height: 54px; padding: 0 22px; border: 1px solid #cbd5e0; background: #fff; border-radius: 12px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
</style>
