<template>
  <div class="split" @click.self="close">
    <div class="split__panel">
      <header class="split__head">
        <h2 class="split__title">
          {{ $i('pos_split_title') }}
        </h2>
        <button type="button" class="split__close" @click="close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <!-- Configure -->
      <div v-if="step === 'configure'" class="split__body">
        <div class="split__modes">
          <button type="button" class="split__mode" :class="{ 'is-active': mode === 'EqualParts' }" @click="mode = 'EqualParts'">
            {{ $i('pos_split_equal') }}
          </button>
          <button type="button" class="split__mode" :class="{ 'is-active': mode === 'ByItem' }" @click="mode = 'ByItem'">
            {{ $i('pos_split_byitem') }}
          </button>
        </div>

        <div class="split__partcount">
          <span>{{ $i('pos_split_parts') }}</span>
          <button type="button" class="split__step" :disabled="partCount <= 2" @click="setParts(partCount - 1)">
            −
          </button>
          <span class="split__partcount-val">{{ partCount }}</span>
          <button type="button" class="split__step" :disabled="partCount >= 8" @click="setParts(partCount + 1)">
            +
          </button>
        </div>

        <!-- ByItem: assign each line to a part -->
        <div v-if="mode === 'ByItem'" class="split__lines">
          <div v-for="(line, idx) in lines" :key="line.orderLineItemId" class="split__line">
            <div class="split__line-info">
              <span class="split__line-name">{{ line.quantity }}× {{ line.name }}</span>
              <span class="split__line-amount">{{ priceLabel(line.netLineAmount) }}</span>
            </div>
            <div class="split__line-parts">
              <button
                v-for="n in partCount"
                :key="n"
                type="button"
                class="split__partbtn"
                :class="{ 'is-active': assignments[idx] === n }"
                @click="$set(assignments, idx, n)"
              >
                {{ n }}
              </button>
            </div>
          </div>
        </div>

        <p v-if="error" class="split__error">
          {{ error }}
        </p>
      </div>

      <!-- Pay parts -->
      <div v-else-if="step === 'pay'" class="split__body">
        <div v-if="!payingPart" class="split__parts">
          <div
            v-for="part in splitModel.parts"
            :key="part.partOrderId"
            class="split__part"
            :class="{ 'is-paid': paid[part.partOrderId] }"
          >
            <div class="split__part-info">
              <span class="split__part-num">{{ $i('pos_split_part') }} {{ part.partNumber }}</span>
              <span class="split__part-amount">{{ priceLabel(part.amount) }}</span>
            </div>
            <button
              v-if="paid[part.partOrderId]"
              type="button"
              class="split__part-paid"
              disabled
            >
              ✓ {{ $i('pos_pay_done') }}
            </button>
            <button v-else type="button" class="split__part-pay" @click="payingPart = part">
              {{ $i('pos_pay_cash') }}
            </button>
          </div>
          <p v-if="allPaid" class="split__done-hint">
            {{ $i('pos_split_all_paid') }}
          </p>
        </div>

        <!-- Part cash pad -->
        <div v-else class="split__paypart">
          <p class="split__paypart-label">
            {{ $i('pos_split_part') }} {{ payingPart.partNumber }}
          </p>
          <CashPad :amount="payingPart.amount" @confirm="onPartCashConfirm" />
          <p v-if="error" class="split__error">
            {{ error }}
          </p>
          <button type="button" class="split__paypart-back" @click="payingPart = null">
            {{ $i('pos_back') }}
          </button>
        </div>
      </div>

      <footer v-if="step === 'configure'" class="split__foot">
        <button type="button" class="split__confirm" :disabled="busy" @click="doSplit">
          {{ busy ? $i('pos_working') : $i('pos_split_confirm') }}
        </button>
      </footer>
      <footer v-else-if="step === 'pay' && allPaid" class="split__foot">
        <button type="button" class="split__confirm" @click="$emit('done')">
          {{ $i('common_done') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import CashPad from '~/components/admin/pos/CashPad.vue';

// Splits an open check into parts (equal shares or by assigning items), each part becoming its own
// order with an open settlement. Each part is then paid separately with cash (allocation + finalize
// on the part's settlement). Card-per-part shares the split-tender terminal gap and is deferred.
export default {
  name: 'SplitBillModal',
  components: { CashPad },
  inject: ['pos'],
  props: {
    check: { type: Object, required: true }
  },
  data () {
    return {
      step: 'configure',
      mode: 'EqualParts',
      partCount: 2,
      assignments: {},
      splitModel: null,
      paid: {},
      payingPart: null,
      busy: false,
      error: ''
    };
  },
  computed: {
    lines () { return this.check.items || []; },
    cashPointId () { return this.pos.cashPoint.cashPointId; },
    allPaid () {
      return this.splitModel && this.splitModel.parts.every(p => this.paid[p.partOrderId]);
    }
  },
  mounted () {
    // Default every line to part 1 for the by-item assignment.
    this.lines.forEach((_line, idx) => { this.$set(this.assignments, idx, 1); });
  },
  methods: {
    close () {
      if (this.step === 'pay') { return; } // don't allow closing mid-payment; parts already exist
      this.$emit('close');
    },
    setParts (n) {
      this.partCount = n;
      // Clamp any assignment above the new part count back to the last part.
      Object.keys(this.assignments).forEach((k) => {
        if (this.assignments[k] > n) { this.$set(this.assignments, k, n); }
      });
    },
    async doSplit () {
      this.busy = true;
      this.error = '';
      try {
        let request;
        if (this.mode === 'EqualParts') {
          request = { mode: 'EqualParts', partCount: this.partCount, parts: [] };
        } else {
          const parts = [];
          for (let n = 1; n <= this.partCount; n++) {
            const ids = this.lines.filter((_line, idx) => this.assignments[idx] === n).map(l => l.orderLineItemId);
            parts.push({ orderLineItemIds: ids });
          }
          if (parts.some(p => p.orderLineItemIds.length === 0)) {
            this.error = this.$i('pos_split_empty_part');
            this.busy = false;
            return;
          }
          request = { mode: 'ByItem', partCount: null, parts };
        }
        this.splitModel = await this.pos.checkSvc().Split(this.check.orderId, request);
        this.step = 'pay';
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    },
    async onPartCashConfirm ({ tendered }) {
      const part = this.payingPart;
      this.busy = true;
      this.error = '';
      try {
        await this.pos.posSvc().AddSettlementAllocation(part.posSettlementId, {
          cashPointId: this.cashPointId,
          paymentType: 'Cash',
          amount: part.amount,
          tenderedAmount: tendered,
          paymentTransactionId: null
        });
        await this.pos.posSvc().FinalizeSettlement(part.posSettlementId, { cashPointId: this.cashPointId });
        this.$set(this.paid, part.partOrderId, true);
        this.payingPart = null;
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
.split { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1150; padding: 16px; }
.split__panel { background: #fff; border-radius: 18px; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.split__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.split__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.split__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.split__close svg { width: 24px; height: 24px; }
.split__body { padding: 16px 20px; overflow-y: auto; }

.split__modes { display: flex; background: #eef1f5; border-radius: 12px; padding: 4px; margin-bottom: 16px; }
.split__mode { flex: 1; border: none; background: none; padding: 10px; border-radius: 9px; font-weight: 600; color: #64748b; cursor: pointer; }
.split__mode.is-active { background: #fff; color: var(--pos-ink, #292c34); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }

.split__partcount { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-weight: 600; color: #64748b; }
.split__step { width: 40px; height: 40px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-size: 1.3rem; font-weight: 700; cursor: pointer; }
.split__step:disabled { opacity: 0.4; cursor: not-allowed; }
.split__partcount-val { font-size: 1.2rem; font-weight: 700; color: var(--pos-ink, #292c34); min-width: 24px; text-align: center; }

.split__line { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.split__line-info { display: flex; flex-direction: column; }
.split__line-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.split__line-amount { font-size: 0.85rem; color: #64748b; }
.split__line-parts { display: flex; gap: 4px; }
.split__partbtn { width: 34px; height: 34px; border: 1px solid #cbd5e0; background: #fff; border-radius: 8px; font-weight: 700; color: #64748b; cursor: pointer; }
.split__partbtn.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #fff; }

.split__part { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; }
.split__part.is-paid { background: rgba(27, 183, 118, 0.06); border-color: var(--pos-primary, #1bb776); }
.split__part-info { display: flex; flex-direction: column; }
.split__part-num { font-size: 0.8rem; color: #64748b; font-weight: 600; }
.split__part-amount { font-size: 1.2rem; font-weight: 800; color: var(--pos-ink, #292c34); }
.split__part-pay { border: none; background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; padding: 10px 18px; border-radius: 10px; cursor: pointer; }
.split__part-paid { border: none; background: none; color: var(--pos-primary-dark, #159f63); font-weight: 700; }
.split__done-hint { text-align: center; color: var(--pos-primary-dark, #159f63); font-weight: 600; margin-top: 10px; }

.split__paypart-label { text-align: center; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0 0 12px; }
.split__paypart-back { display: block; margin: 12px auto 0; border: none; background: none; color: #64748b; font-weight: 600; cursor: pointer; }

.split__error { color: #ef4444; font-weight: 600; text-align: center; margin: 12px 0 0; }
.split__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.split__confirm { width: 100%; height: 54px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.split__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
