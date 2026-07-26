<template>
  <div class="receipts">
    <div class="receipts__inner">
      <header class="receipts__head">
        <div class="receipts__day">
          <button type="button" class="receipts__nav" :aria-label="$i('pos_receipts_prev_day')" @click="stepDay(-1)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div class="receipts__day-text">
            <span class="receipts__day-main">{{ dayMain }}</span>
            <span v-if="daySub" class="receipts__day-sub">{{ daySub }}</span>
          </div>
          <button
            type="button"
            class="receipts__nav"
            :aria-label="$i('pos_receipts_next_day')"
            :disabled="isToday"
            @click="stepDay(1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button v-if="!isToday" type="button" class="receipts__today" @click="goToday">
            {{ $i('pos_receipts_today') }}
          </button>
        </div>

        <div class="receipts__search">
          <svg class="receipts__search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input v-model="query" type="text" class="receipts__search-input" :placeholder="$i('pos_receipts_search_ph')">
          <button v-if="query" type="button" class="receipts__search-clear" :aria-label="$i('common_close')" @click="query = ''">
            ×
          </button>
        </div>
      </header>

      <div v-if="loading && !entries.length" class="receipts__state">
        {{ $i('pos_loading') }}
      </div>
      <div v-else-if="error" class="receipts__state receipts__state--error">
        <p>{{ error }}</p>
        <button type="button" class="receipts__retry" @click="load()">
          {{ $i('pos_retry') }}
        </button>
      </div>
      <!-- No match is not the end of the road: the filter only sees the pages loaded so far, and a
           busy day runs past the first hundred. Keep loading reachable from here, or searching for
           a customer's amount on a big day is a dead end — the one thing this screen is for. -->
      <div v-else-if="!filtered.length" class="receipts__state">
        <p>{{ query ? $i('pos_receipts_no_match') : $i('pos_receipts_empty') }}</p>
        <button v-if="hasMore" type="button" class="receipts__retry" :disabled="loading" @click="loadMore">
          {{ loading ? $i('pos_loading') : $i('pos_receipts_load_more', { count: remaining }) }}
        </button>
      </div>

      <div v-else class="receipts__list">
        <!-- The amount is the hero. A customer describes their purchase by what it cost and roughly
             when — never by receipt number, which is our identifier, not theirs. -->
        <button
          v-for="e in filtered"
          :key="e.journalEntryId"
          type="button"
          class="receipts__row"
          :class="{ 'is-muted': isMuted(e) }"
          @click="open(e)"
        >
          <span class="receipts__row-left">
            <span class="receipts__row-time">{{ timeOf(e) }}</span>
            <span class="receipts__row-meta">
              <span v-if="kindLabel(e)" class="receipts__tag" :class="'receipts__tag--' + kindOf(e)">{{ kindLabel(e) }}</span>
              <span class="receipts__row-sub">{{ subLine(e) }}</span>
            </span>
          </span>
          <span class="receipts__row-amount" :class="{ 'is-negative': signedAmount(e) < 0 }">
            {{ priceLabel(signedAmount(e)) }}
          </span>
        </button>

        <button v-if="hasMore" type="button" class="receipts__more" :disabled="loading" @click="loadMore">
          {{ loading ? $i('pos_loading') : $i('pos_receipts_load_more', { count: remaining }) }}
        </button>
      </div>
    </div>

    <!-- Detail. One thing the operator is trying to do for the customer, so one primary action. -->
    <div v-if="selected" class="receipts__overlay" @click.self="closeDetail">
      <div class="receipts__sheet">
        <div class="receipts__doc">
          <PosReceiptView ref="receiptView" :receipt="selected" />
        </div>

        <div class="receipts__panel">
          <ReceiptSend :journal-entry-id="selected.journalEntryId" />

          <button type="button" class="receipts__secondary" :disabled="printing" @click="printCopy">
            {{ printing ? $i('pos_working') : $i('pos_receipts_print') }}
          </button>
          <p v-if="printError" class="receipts__error-text">
            {{ printError }}
          </p>

          <!-- Refund is money leaving the till, so it never sits in the same group as the two
               harmless actions above. It also says why it is unavailable rather than vanishing. -->
          <div class="receipts__danger">
            <button type="button" class="receipts__refund" :disabled="!canRefund" @click="showRefund = true">
              {{ $i('pos_refund_sale') }}
            </button>
            <p v-if="refundBlockedReason" class="receipts__danger-note">
              {{ refundBlockedReason }}
            </p>
          </div>

          <button type="button" class="receipts__close" @click="closeDetail">
            {{ $i('common_close') }}
          </button>
        </div>
      </div>
    </div>

    <RefundModal
      v-if="showRefund && selected"
      :receipt="selected"
      @done="onRefunded"
      @close="showRefund = false"
    />
  </div>
</template>

<script>
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';
import RefundModal from '~/components/admin/pos/RefundModal.vue';
import ReceiptSend from '~/components/admin/pos/ReceiptSend.vue';

const PAGE_SIZE = 100;

// Past purchases for the whole store, newest first, one day at a time. The screen exists for what
// a customer at the counter asks for — "can I get my receipt again?" and "I'd like to return this"
// — so it is built around those two answers rather than around the journal it reads from.
export default {
  name: 'ReceiptsView',
  components: { PosReceiptView, RefundModal, ReceiptSend },
  inject: ['pos'],
  data () {
    return {
      // Local calendar day being browsed, as YYYY-MM-DD (journal timestamps are Oslo wall-clock).
      day: this.todayKey(),
      // Today's date key, kept current so the day navigation survives midnight on a register that
      // is never closed. Only `syncToday` writes it.
      today: this.todayKey(),
      entries: [],
      totalCount: 0,
      page: 1,
      loading: false,
      error: '',
      query: '',
      selected: null,
      showRefund: false,
      printing: false,
      printError: '',
    };
  },
  computed: {
    // Compared against the reactive `today` field, not a fresh new Date() — see mounted.
    isToday () { return this.day === this.today; },
    dayMain () {
      if (this.isToday) { return this.$i('pos_receipts_today'); }
      const d = this.dayDate();
      return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    },
    // Today's actual date rides underneath, so "I dag" is friendly without being vague.
    daySub () {
      if (!this.isToday) { return ''; }
      return this.dayDate().toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    },
    showCashPoint () { return (this.pos.cashPoints || []).length > 1; },
    remaining () { return Math.max(0, this.totalCount - this.entries.length); },
    hasMore () { return this.remaining > 0; },
    // Matches how a customer describes a purchase: the amount, or the number if they still have
    // the paper. Matching raw øre too means "249" finds kr 249,00.
    filtered () {
      const q = this.query.trim().toLowerCase();
      if (!q) { return this.entries; }
      return this.entries.filter((e) => {
        const no = String(e.receiptNumber || '');
        const kr = this.priceLabel(e.grossAmount).toLowerCase();
        const ore = String(e.grossAmount || '');
        return no.includes(q) || kr.includes(q) || ore.includes(q);
      });
    },
    refundBlockedReason () {
      const r = this.selected;
      if (!r) { return ''; }
      // Reaching this screen no longer requires an open trading day — a customer comes back for a
      // receipt long after the Z. Refunding is the opposite: it is money leaving the till, and the
      // cash path books a drawer pay-out that needs an open session. Say so before the operator
      // fills in reason, phone and signature and only then meets a backend rejection.
      if (!this.pos.dayOpen) { return this.$i('pos_refund_na_day_closed'); }
      if (r.receiptType === 'Return') { return this.$i('pos_refund_na_return'); }
      if (r.isVoid) { return this.$i('pos_refund_na_void'); }
      if (r.isTraining) { return this.$i('pos_refund_na_training'); }
      if (!(r.payments || []).length) { return this.$i('pos_refund_na_nopayment'); }
      return '';
    },
    canRefund () { return !!this.selected && !this.refundBlockedReason; },
  },
  watch: {
    day () { this.load(); }
  },
  mounted () {
    this.load();
    // A register is left running past midnight every night. `new Date()` is not reactive, so a
    // computed built on it would stay cached on yesterday: the header would keep saying "I dag",
    // the forward arrow would stay disabled and the "I dag" shortcut hidden — the operator locked
    // out of the current day with no way forward. Re-read it on a timer and when the tab is
    // looked at again.
    this._todayTimer = setInterval(this.syncToday, 60000);
    document.addEventListener('visibilitychange', this.syncToday);
  },
  beforeDestroy () {
    if (this._todayTimer) { clearInterval(this._todayTimer); this._todayTimer = null; }
    document.removeEventListener('visibilitychange', this.syncToday);
  },
  methods: {
    todayKey () {
      const n = new Date();
      return n.getFullYear() + '-' + this.pad(n.getMonth() + 1) + '-' + this.pad(n.getDate());
    },
    pad (n) { return n < 10 ? '0' + n : '' + n; },
    syncToday () {
      const key = this.todayKey();
      if (key !== this.today) { this.today = key; }
    },
    dayDate () {
      const parts = this.day.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    },
    stepDay (delta) {
      this.syncToday();
      const d = this.dayDate();
      d.setDate(d.getDate() + delta);
      const next = d.getFullYear() + '-' + this.pad(d.getMonth() + 1) + '-' + this.pad(d.getDate());
      // Never walk into the future: there is nothing there, and an empty list reads as a bug.
      if (next > this.today) { return; }
      this.day = next;
    },
    goToday () {
      this.syncToday();
      this.day = this.today;
    },

    async load (append = false) {
      if (!append) {
        this.page = 1;
        this.entries = [];
        this.totalCount = 0;
      }
      this.loading = true;
      this.error = '';
      // Two taps on "forrige dag" put two reads in flight, and nothing says the first one answers
      // first. The day is captured here and re-checked on arrival: a response for a day the
      // operator has already left is dropped rather than painted under a header that says
      // otherwise — telling a customer their receipt does not exist is the failure this prevents.
      const forDay = this.day;
      const forPage = this.page;
      try {
        const res = await this.pos.journalSvc().GetForStore(
          this.pos.storeId, forDay + 'T00:00:00', forDay + 'T23:59:59', forPage, PAGE_SIZE
        );
        if (forDay !== this.day) { return; }
        const batch = (res && res.entries) || [];
        this.totalCount = (res && res.totalCount) || 0;
        this.entries = append ? this.entries.concat(batch) : batch;
      } catch (e) {
        if (forDay !== this.day) { return; }
        // A failed append must not take the rows already on screen with it: the error branch
        // replaces the whole list, so the operator would lose everything they had loaded because
        // page 3 timed out. Report it as a toast and leave the list — and the button — standing.
        if (append) {
          this.page = Math.max(1, this.page - 1);
          this.pos.notify(this.pos.errMsg(e), 'error');
        } else {
          this.error = this.pos.errMsg(e);
        }
      } finally {
        // Only the read that still matches the day on screen owns the spinner; a stale one
        // clearing it would re-enable the buttons while the current read is still in flight.
        if (forDay === this.day) { this.loading = false; }
      }
    },
    loadMore () {
      if (this.loading || !this.hasMore) { return; }
      this.page++;
      this.load(true);
    },

    // ---- Rows ----
    timeOf (e) {
      const t = e.timestamp ? new Date(e.timestamp) : null;
      return t ? this.pad(t.getHours()) + ':' + this.pad(t.getMinutes()) : '';
    },
    kindOf (e) {
      if (e.isVoid) { return 'void'; }
      if (e.isTraining) { return 'training'; }
      if (e.receiptType === 'Return') { return 'return'; }
      return 'sale';
    },
    // Only the exceptions get a badge. Badging every ordinary sale would hide the ones that matter.
    kindLabel (e) {
      const map = {
        void: this.$i('pos_receipts_kind_void'),
        training: this.$i('pos_receipts_kind_training'),
        return: this.$i('pos_receipts_kind_return'),
        sale: ''
      };
      return map[this.kindOf(e)];
    },
    isMuted (e) {
      const kind = this.kindOf(e);
      return kind === 'void' || kind === 'training';
    },
    // Receipt number and tender are how the operator confirms they picked the right one — useful,
    // but secondary to the amount, so they share one quiet line.
    subLine (e) {
      const bits = ['#' + e.receiptNumber];
      const tender = this.tenderLabel(e);
      if (tender) { bits.push(tender); }
      if (this.showCashPoint) {
        const cp = this.cashPointName(e);
        if (cp) { bits.push(cp); }
      }
      return bits.join(' · ');
    },
    signedAmount (e) {
      const amount = e.grossAmount || 0;
      return e.receiptType === 'Return' ? -Math.abs(amount) : amount;
    },
    tenderLabel (e) {
      const lines = e.paymentLines || [];
      if (lines.some(p => p.paymentTransactionId)) { return this.$i('pos_pay_card'); }
      if (lines.some(p => p.paymentType === 'Cash')) { return this.$i('pos_pay_cash'); }
      return '';
    },
    cashPointName (e) {
      const cp = (this.pos.cashPoints || []).find(c => c.cashPointId === e.cashPointId);
      return cp ? cp.name : '';
    },

    // ---- Detail ----
    // The detail sheet carries Send, Kopi and Refunder, so it must never end up describing a
    // different receipt than the row that was tapped. Two quick taps race, and the last response
    // to ARRIVE would win: the id is pinned here and a response that no longer matches is dropped.
    async open (entry) {
      this.resetActions();
      const wanted = entry.journalEntryId;
      this._openWanted = wanted;
      try {
        const receipt = await this.pos.posSvc().GetReceipt(wanted);
        if (this._openWanted !== wanted) { return; }
        this.selected = receipt;
      } catch (e) {
        if (this._openWanted !== wanted) { return; }
        this.pos.notify(this.pos.errMsg(e), 'error');
      }
    },
    resetActions () {
      this.printError = '';
    },
    closeDetail () {
      this.selected = null;
      this.showRefund = false;
      this.resetActions();
    },


    // A reprint is always a marked copy — reproducing the original would hand the customer a second
    // unmarked original. The one-copy limit is the server's to enforce; when it refuses, the
    // operator gets a plain sentence and the alternative that still works, not a rule number.
    async printCopy () {
      if (this.printing || !this.selected) { return; }
      this.printing = true;
      this.printError = '';
      try {
        const copy = await this.pos.posSvc().CopyReceipt(this.selected.journalEntryId, {
          cashPointId: this.pos.cashPoint.cashPointId
        });
        this.selected = copy;
        await this.$nextTick();
        if (await this.pos.printReceiptDoc(copy)) {
          this.pos.notify(this.$i('pos_receipt_printed'), 'success', { replaceKey: 'report-printed' });
        } else if (this.$refs.receiptView) {
          this.$refs.receiptView.print();
        }
      } catch (e) {
        this.printError = this.isCopyRefused(e) ? this.$i('pos_receipts_print_already') : this.pos.errMsg(e);
      } finally {
        this.printing = false;
      }
    },
    // The backend's refusal is an English constant; the operator gets the human version plus the
    // route that still works.
    isCopyRefused (e) {
      const raw = (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || '';
      return raw.toLowerCase().includes('copied');
    },

    onRefunded () {
      this.showRefund = false;
      this.selected = null;
      // The refund cut a receipt of its own, so the list must show it.
      this.load();
    }
  }
};
</script>

<style scoped>
.receipts { position: absolute; inset: 0; overflow-y: auto; background: var(--pos-surface, #f8f9fa); }
.receipts__inner { max-width: 820px; margin: 0 auto; padding: 24px 20px 48px; }

.receipts__head { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 20px; }

.receipts__day { display: flex; align-items: center; gap: 4px; }
.receipts__nav {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  background: none;
  color: #64748b;
  cursor: pointer;
}
.receipts__nav:hover:not(:disabled) { background: #eef2f7; color: var(--pos-ink, #292c34); }
.receipts__nav:disabled { opacity: 0.3; cursor: default; }
.receipts__nav svg { width: 20px; height: 20px; }

.receipts__day-text { display: flex; flex-direction: column; min-width: 150px; text-align: center; }
.receipts__day-main { font-size: 1.15rem; font-weight: 700; color: var(--pos-ink, #292c34); text-transform: capitalize; }
.receipts__day-sub { font-size: 0.78rem; color: #94a3b8; text-transform: capitalize; }
.receipts__today {
  min-height: 44px;
  margin-left: 4px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: none;
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
  cursor: pointer;
}
.receipts__today:hover { background: rgba(27, 183, 118, 0.08); }

.receipts__search { position: relative; display: flex; align-items: center; flex: 1; min-width: 220px; }
.receipts__search-icon { position: absolute; left: 14px; width: 18px; height: 18px; color: #94a3b8; }
.receipts__search-input {
  width: 100%;
  min-height: 46px;
  padding: 0 40px 0 42px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: #eef2f7;
  font-size: 0.95rem;
  color: var(--pos-ink, #292c34);
}
.receipts__search-input:focus { outline: none; background: #ffffff; border-color: var(--pos-primary, #1bb776); }
.receipts__search-clear {
  position: absolute;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  color: #94a3b8;
  font-size: 1.3rem;
  cursor: pointer;
}

.receipts__state { padding: 64px 0; text-align: center; color: #64748b; }
.receipts__state--error { color: #ef4444; font-weight: 600; }
.receipts__retry {
  margin-top: 14px;
  min-height: 46px;
  padding: 0 22px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.receipts__list { display: flex; flex-direction: column; gap: 8px; }
.receipts__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 72px;
  padding: 12px 18px;
  border: 1px solid #e8edf3;
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.receipts__row:hover { border-color: #cbd5e0; transform: translateY(-1px); }
.receipts__row.is-muted { opacity: 0.55; }

.receipts__row-left { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.receipts__row-time { font-size: 1rem; font-weight: 600; color: var(--pos-ink, #292c34); font-variant-numeric: tabular-nums; }
.receipts__row-meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
.receipts__row-sub { font-size: 0.82rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.receipts__row-amount {
  flex-shrink: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  font-variant-numeric: tabular-nums;
}
.receipts__row-amount.is-negative { color: #dc2626; }

.receipts__tag {
  flex-shrink: 0;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 7px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #64748b;
}
.receipts__tag--return { background: #fef2f2; color: #dc2626; }
.receipts__tag--void { background: #f1f5f9; color: #94a3b8; }
.receipts__tag--training { background: #fffbeb; color: #b45309; }

.receipts__more {
  min-height: 52px;
  margin-top: 4px;
  border: 1px dashed #cbd5e0;
  border-radius: 14px;
  background: none;
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
  cursor: pointer;
}
.receipts__more:disabled { color: #94a3b8; cursor: default; }

/* ---- Detail ---- */
.receipts__overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1100;
}
.receipts__sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  max-height: 92vh;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
}
.receipts__doc { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 20px 8px; }
.receipts__panel { flex-shrink: 0; padding: 8px 20px 20px; border-top: 1px solid #f1f5f9; }

.receipts__primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 54px;
  margin-top: 12px;
  border: none;
  border-radius: 14px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.receipts__primary:hover { background: var(--pos-primary-dark, #159f63); }
.receipts__primary svg { width: 20px; height: 20px; }

.receipts__secondary {
  width: 100%;
  min-height: 50px;
  margin-top: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.receipts__secondary:hover:not(:disabled) { background: #f8fafc; }
.receipts__secondary:disabled { opacity: 0.55; cursor: default; }

.receipts__field-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}
.receipts__field { display: flex; gap: 8px; }
.receipts__field-input {
  flex: 1;
  min-width: 0;
  min-height: 50px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1.05rem;
  color: var(--pos-ink, #292c34);
  font-variant-numeric: tabular-nums;
}
.receipts__field-input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.receipts__field-send {
  flex-shrink: 0;
  min-height: 50px;
  padding: 0 20px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}
.receipts__field-send:disabled { background: #cbd5e0; cursor: default; }

.receipts__sent {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(27, 183, 118, 0.1);
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
}
.receipts__sent svg { width: 20px; height: 20px; flex-shrink: 0; }
.receipts__sent-again {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--pos-primary-dark, #159f63);
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}

.receipts__error-text { margin: 10px 0 0; color: #ef4444; font-size: 0.88rem; font-weight: 600; }

.receipts__danger { margin-top: 18px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
.receipts__refund {
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: none;
  color: #dc2626;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.receipts__refund:hover:not(:disabled) { background: #fef2f2; }
.receipts__refund:disabled { color: #cbd5e0; cursor: default; }
.receipts__danger-note { margin: 4px 0 0; text-align: center; color: #94a3b8; font-size: 0.8rem; }

.receipts__close {
  width: 100%;
  min-height: 46px;
  margin-top: 6px;
  border: none;
  background: none;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 720px) {
  .receipts__inner { padding: 16px 12px 32px; }
  .receipts__day { flex: 1; }
  .receipts__day-text { flex: 1; min-width: 0; }
  .receipts__search { flex-basis: 100%; }
  .receipts__row { padding: 12px 14px; }
  .receipts__row-amount { font-size: 1.15rem; }
}
</style>
