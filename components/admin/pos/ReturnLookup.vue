<template>
  <div class="lookup" @click.self="$emit('close')">
    <div class="lookup__panel">
      <header class="lookup__head">
        <h2 class="lookup__title">
          {{ $i('pos_return_lookup_title') }}
        </h2>
        <button type="button" class="lookup__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="lookup__search">
        <input v-model="query" type="text" class="lookup__input" :placeholder="$i('pos_return_lookup_search_ph')">
      </div>

      <div class="lookup__body">
        <div v-if="loading" class="lookup__state">
          {{ $i('pos_loading') }}
        </div>
        <div v-else-if="error" class="lookup__state lookup__state--error">
          {{ error }}
        </div>
        <div v-else-if="!filtered.length" class="lookup__state">
          {{ $i('pos_return_lookup_empty') }}
        </div>
        <button
          v-for="sale in filtered"
          :key="sale.journalEntryId"
          type="button"
          class="lookup__row"
          @click="pick(sale)"
        >
          <span class="lookup__row-main">
            <span class="lookup__row-no">#{{ sale.receiptNumber }}</span>
            <span class="lookup__row-time">{{ timeOf(sale) }}</span>
          </span>
          <span class="lookup__row-side">
            <span class="lookup__row-amount">{{ priceLabel(sale.grossAmount) }}</span>
            <span class="lookup__row-tender">{{ tenderLabel(sale) }}</span>
          </span>
        </button>
      </div>
    </div>

    <RefundModal
      v-if="selectedReceipt"
      :receipt="selectedReceipt"
      @done="onRefunded"
      @close="selectedReceipt = null"
    />
  </div>
</template>

<script>
import RefundModal from '~/components/admin/pos/RefundModal.vue';

// Find a finalized sale on this cash point (today's journal) and refund it. Sales are read from the
// audited journal; picking one loads its full receipt and opens the RefundModal, which routes the
// refund to the original card or to cash by the sale's payment mean.
export default {
  name: 'ReturnLookup',
  components: { RefundModal },
  inject: ['pos'],
  data () {
    return {
      loading: true,
      error: '',
      sales: [],
      query: '',
      selectedReceipt: null
    };
  },
  computed: {
    filtered () {
      const q = this.query.trim().toLowerCase();
      if (!q) { return this.sales; }
      return this.sales.filter((s) => {
        const no = String(s.receiptNumber || '');
        const kr = String(Math.round((s.grossAmount || 0) / 100));
        return no.includes(q) || kr.includes(q);
      });
    }
  },
  mounted () {
    this.load();
  },
  methods: {
    async load () {
      this.loading = true;
      this.error = '';
      try {
        // Journal timestamps are Oslo wall-clock; window on today's local date without a UTC shift.
        const now = new Date();
        const from = now.getFullYear() + '-' + this.pad(now.getMonth() + 1) + '-' + this.pad(now.getDate()) + 'T00:00:00';
        const page = await this.pos.journalSvc().GetForCashPoint(this.pos.cashPoint.cashPointId, from, undefined, 1, 300);
        const entries = (page && page.entries) || [];
        this.sales = entries
          .filter(e => e.receiptType === 'Sale' && !e.isVoid && !e.isTraining)
          .sort((a, b) => (b.receiptNumber || 0) - (a.receiptNumber || 0));
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.loading = false;
      }
    },
    pad (n) { return n < 10 ? '0' + n : '' + n; },
    timeOf (sale) {
      const t = sale.timestamp ? new Date(sale.timestamp) : null;
      return t ? this.pad(t.getHours()) + ':' + this.pad(t.getMinutes()) : '';
    },
    tenderLabel (sale) {
      const lines = sale.paymentLines || [];
      if (lines.some(p => p.paymentTransactionId)) { return this.$i('pos_pay_card'); }
      if (lines.some(p => p.paymentType === 'Cash')) { return this.$i('pos_pay_cash'); }
      return '';
    },
    async pick (sale) {
      try {
        this.selectedReceipt = await this.pos.posSvc().GetReceipt(sale.journalEntryId);
      } catch (e) {
        this.error = this.pos.errMsg(e);
      }
    },
    onRefunded () {
      this.selectedReceipt = null;
      this.load();
    }
  }
};
</script>

<style scoped>
.lookup { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 16px; }
.lookup__panel { background: #fff; border-radius: 18px; width: 100%; max-width: 480px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.lookup__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.lookup__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.lookup__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.lookup__close svg { width: 24px; height: 24px; }

.lookup__search { padding: 12px 20px; }
.lookup__input { width: 100%; height: 46px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 1rem; }
.lookup__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }

.lookup__body { flex: 1; overflow-y: auto; padding: 0 12px 16px; }
.lookup__state { text-align: center; color: #94a3b8; padding: 30px 0; }
.lookup__state--error { color: #ef4444; font-weight: 600; }

.lookup__row { display: flex; align-items: center; justify-content: space-between; width: 100%; background: #fff; border: 1px solid #eef1f5; border-radius: 12px; padding: 12px 14px; margin: 6px 0; cursor: pointer; text-align: left; }
.lookup__row:hover { border-color: var(--pos-primary, #1bb776); }
.lookup__row-main { display: flex; flex-direction: column; gap: 2px; }
.lookup__row-no { font-weight: 700; color: var(--pos-ink, #292c34); }
.lookup__row-time { font-size: 0.8rem; color: #94a3b8; }
.lookup__row-side { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.lookup__row-amount { font-weight: 700; color: var(--pos-ink, #292c34); }
.lookup__row-tender { font-size: 0.8rem; color: #64748b; }
</style>
