<template>
  <aside class="check-panel">
    <!-- Parked checks: a slim, always-in-the-same-place bar at the top of the order column. -->
    <button
      v-if="parkedCount > 0"
      type="button"
      class="check-panel__parked"
      @click="$emit('show-parked')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
      <span>{{ $i('pos_parked_count', { count: parkedCount }) }}</span>
      <svg class="check-panel__parked-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
    </button>

    <header class="check-panel__head">
      <div class="check-panel__title-row">
        <span class="check-panel__title">{{ headerTitle }}</span>
        <span v-if="check" class="check-panel__delivery">{{ deliveryLabel }}</span>
      </div>

      <!-- Guest count for a table check: a chip that opens an inline stepper. Set it whenever;
           not required to open the check. -->
      <div v-if="check && check.tableId" class="check-panel__guests">
        <button
          v-if="!editingCouverts"
          type="button"
          class="check-panel__guests-chip"
          @click="startEditCouverts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
          <span>{{ check.couverts ? $i('pos_couverts', { count: check.couverts }) : $i('pos_guests_set') }}</span>
        </button>
        <div v-else class="check-panel__guests-edit">
          <button type="button" class="check-panel__guests-step" :disabled="couvertsDraft <= 1" @click="couvertsDraft--">
            −
          </button>
          <span class="check-panel__guests-val">{{ couvertsDraft }}</span>
          <button type="button" class="check-panel__guests-step" @click="couvertsDraft++">
            +
          </button>
          <button type="button" class="check-panel__guests-ok" @click="confirmCouverts">
            {{ $i('common_done') }}
          </button>
        </div>
      </div>
    </header>

    <div class="check-panel__lines">
      <div v-if="!hasItems" class="check-panel__empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        <p>{{ $i('pos_check_empty') }}</p>
      </div>
      <template v-for="section in courseSections">
        <div v-if="section.course !== null" :key="'h' + section.course" class="check-panel__course">
          <span class="check-panel__course-name">{{ $i('pos_course') }} {{ section.course }}</span>
          <div class="check-panel__course-actions">
            <button
              v-if="section.fireable"
              type="button"
              class="check-panel__fire"
              @click="$emit('fire-course', section.course)"
            >
              {{ $i('pos_fire_course') }}
            </button>
            <button
              v-if="section.serveable"
              type="button"
              class="check-panel__serve-course"
              @click="$emit('serve-course', section.course)"
            >
              {{ $i('pos_serve_course') }}
            </button>
          </div>
        </div>
        <CheckLine
          v-for="g in section.groups"
          :key="g.key"
          :group="g"
          :coursing="coursingEnabled"
          :seating="seating"
          @inc="$emit('inc', g)"
          @dec="$emit('dec', g)"
          @remove="$emit('remove', g)"
          @note="$emit('note', g)"
          @seat="$emit('seat', g)"
          @serve="$emit('serve', g)"
          @line-discount="$emit('line-discount', g)"
          @line-remove-discount="$emit('line-remove-discount', g)"
        />
      </template>
    </div>

    <footer class="check-panel__foot">
      <div v-if="hasItems" class="check-panel__totals">
        <div v-if="totalDiscount > 0" class="check-panel__total-row">
          <span>
            {{ $i('pos_discount') }}
            <button type="button" class="check-panel__discount-remove" :title="$i('pos_remove_discount')" @click="$emit('remove-discount')">×</button>
          </span>
          <span class="check-panel__discount">−{{ priceLabel(totalDiscount) }}</span>
        </div>
        <div class="check-panel__total-row check-panel__total-row--grand">
          <span>{{ $i('pos_total') }}</span>
          <span>{{ priceLabel(finalAmount) }}</span>
        </div>
      </div>

      <!-- Send newly added ("Ny") lines to the kitchen. Table checks only, and only when there is
           something new to send. -->
      <button
        v-if="coursingEnabled && pendingCount > 0"
        type="button"
        class="check-panel__send"
        @click="$emit('send-to-kitchen')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 12h14M12 5l7 7-7 7" /></svg>
        <span>{{ $i('pos_send_count', { count: pendingCount }) }}</span>
      </button>

      <div class="check-panel__actions">
        <button type="button" class="check-panel__action" :disabled="!check" @click="$emit('park')">
          {{ $i('pos_park') }}
        </button>
        <button type="button" class="check-panel__action" :disabled="!hasItems" @click="$emit('discount')">
          {{ $i('pos_discount') }}
        </button>
        <!-- The whole bill becomes the return: ring the goods in, one tap, settle. -->
        <button type="button" class="check-panel__action check-panel__action--negative" :disabled="!hasItems" @click="$emit('negative-sale', groups)">
          {{ $i('pos_negative_sale') }}
        </button>
        <button type="button" class="check-panel__action check-panel__action--icon" :disabled="!check" @click="$emit('more')">
          ⋮
        </button>
      </div>

      <button
        type="button"
        class="check-panel__pay"
        :disabled="!hasItems"
        @click="$emit('pay')"
      >
        <span>{{ $i('pos_pay') }}</span>
        <span class="check-panel__pay-amount">{{ priceLabel(finalAmount) }}</span>
      </button>
    </footer>
  </aside>
</template>

<script>
import CheckLine from '~/components/admin/pos/CheckLine.vue';

// The open-check panel (right column of the sales screen). Groups identical server lines into
// quantity rows and shows the server-authoritative totals. All mutations are delegated upward.
export default {
  name: 'CheckPanel',
  components: { CheckLine },
  props: {
    check: { type: Object, default: null },
    parkedCount: { type: Number, default: 0 },
    // Whether guest (seat) tagging is in play; drives the per-line guest tag on each row.
    seating: { type: Boolean, default: false }
  },
  data () {
    return {
      editingCouverts: false,
      couvertsDraft: 1
    };
  },
  computed: {
    items () { return (this.check && this.check.items) || []; },
    hasItems () { return this.items.length > 0; },
    // Coursing (line status, course tags, the send button) is a table-service concept; a quick sale
    // has no tableId and no kitchen round.
    coursingEnabled () { return !!(this.check && this.check.tableId); },
    // New ("Ny") lines waiting to be sent to the kitchen. The server decides which actually print
    // (drinks may not); this is the count the operator sees as still un-sent.
    pendingCount () { return this.items.filter(i => i.status === 'Pending').length; },
    groups () {
      const map = {};
      const order = [];
      this.items.forEach((line) => {
        const optSig = (line.options || []).map(o => (o.parentName || '') + '~' + o.name).join(',');
        const key = [
          line.productId,
          line.isOpenPrice ? 'op' : '',
          line.name,
          line.unitAmount,
          line.tax,
          optSig,
          line.notes || '',
          line.courseSequence || '',
          // Different guests must not fold into one row (the row's guest tag has to stay meaningful).
          line.seatNumber || '',
          // Only the reason, not the amount: a fixed discount is split proportionally across the
          // member lines, and uneven ore shares must not break the row apart (the row shows the
          // summed amount).
          line.discountReason || '',
          // Keep a just-added "Ny" line as its own row rather than folding it into an already-sent
          // group of the same product, so the Ny / Sendt distinction stays visible.
          line.status || ''
        ].join('|');
        if (!map[key]) {
          map[key] = {
            key,
            name: line.name,
            productId: line.productId,
            isOpenPrice: line.isOpenPrice,
            options: line.options || [],
            notes: line.notes || '',
            courseSequence: line.courseSequence,
            seatNumber: line.seatNumber != null ? line.seatNumber : null,
            status: line.status,
            unitAmount: line.unitAmount,
            tax: line.tax,
            quantity: 0,
            lineAmount: 0,
            discountAmount: 0,
            discountReason: line.discountReason,
            depositAmount: 0,
            goodsGroupId: line.goodsGroupId != null ? line.goodsGroupId : null,
            lineIds: []
          };
          order.push(key);
        }
        const g = map[key];
        g.quantity += line.quantity;
        g.lineAmount += line.netLineAmount;
        g.discountAmount += line.discountAmount || 0;
        g.depositAmount += line.depositAmount || 0;
        g.lineIds.push(line.orderLineItemId);
      });
      return order.map(k => map[k]);
    },
    // Groups the check rows into course sections in first-seen order. A section is fireable while any
    // of its lines is still Sent (not yet fired to the kitchen), and serveable once any line has been
    // fired or marked ready by the kitchen (so a whole course can be run out in one tap).
    courseSections () {
      const map = {};
      const order = [];
      this.groups.forEach((g) => {
        const course = g.courseSequence || null;
        const key = course === null ? 'none' : String(course);
        if (!map[key]) {
          map[key] = { course, groups: [], fireable: false, serveable: false };
          order.push(key);
        }
        map[key].groups.push(g);
        if (g.status === 'Sent') { map[key].fireable = true; }
        if (g.status === 'Fired' || g.status === 'Ready') { map[key].serveable = true; }
      });
      return order.map(k => map[k]);
    },
    finalAmount () { return this.check ? this.check.finalAmount : 0; },
    totalDiscount () {
      return this.groups.reduce((sum, g) => sum + (g.discountAmount || 0), 0);
    },
    headerTitle () {
      if (this.check && this.check.tableId) { return this.check.tableName || this.$i('pos_table'); }
      return this.$i('pos_quick_sale');
    },
    deliveryLabel () {
      return this.check && this.check.deliveryType === 'SelfPickup'
        ? this.$i('pos_takeaway')
        : this.$i('pos_eat_in');
    }
  },
  methods: {
    startEditCouverts () {
      this.couvertsDraft = (this.check && this.check.couverts) || 2;
      this.editingCouverts = true;
    },
    confirmCouverts () {
      this.editingCouverts = false;
      this.$emit('set-couverts', this.couvertsDraft);
    }
  }
};
</script>

<style scoped>
.check-panel {
  width: 380px;
  flex-shrink: 0;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.check-panel__parked {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  border-bottom: 1px solid #eef1f5;
  background: #12141a;
  color: #ffffff;
  padding: 11px 18px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.check-panel__parked svg { width: 17px; height: 17px; }
.check-panel__parked-chevron { margin-left: auto; opacity: 0.7; }

.check-panel__head {
  padding: 16px 18px 12px;
  border-bottom: 1px solid #eef1f5;
}
.check-panel__title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.check-panel__title { font-size: 1.15rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.check-panel__delivery {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--pos-primary-dark, #159f63);
  background: rgba(27, 183, 118, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
}
.check-panel__guests { margin-top: 8px; }
.check-panel__guests-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  padding: 5px 12px;
  border-radius: 18px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.check-panel__guests-chip:hover { border-color: var(--pos-primary, #1bb776); }
.check-panel__guests-chip svg { width: 16px; height: 16px; color: #64748b; }
.check-panel__guests-edit { display: inline-flex; align-items: center; gap: 8px; }
.check-panel__guests-step { width: 34px; height: 34px; border: 1px solid #cbd5e0; background: #fff; border-radius: 9px; font-size: 1.2rem; font-weight: 700; cursor: pointer; color: var(--pos-ink, #292c34); }
.check-panel__guests-step:disabled { opacity: 0.4; cursor: not-allowed; }
.check-panel__guests-val { font-size: 1.05rem; font-weight: 700; color: var(--pos-ink, #292c34); min-width: 22px; text-align: center; }
.check-panel__guests-ok { border: none; background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; padding: 7px 14px; border-radius: 9px; cursor: pointer; font-size: 0.85rem; }

.check-panel__lines { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 18px; }
.check-panel__course { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 4px; border-bottom: 1px solid #eef1f5; margin-top: 4px; }
.check-panel__course-name { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
.check-panel__course-actions { display: flex; gap: 6px; }
.check-panel__fire { border: 1px solid var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); font-weight: 700; font-size: 0.75rem; padding: 4px 12px; border-radius: 7px; cursor: pointer; }
.check-panel__fire:hover { background: var(--pos-primary, #1bb776); color: #fff; }
/* Serve the whole course in one tap. Filled green — the celebratory "run it out" action. */
.check-panel__serve-course { border: 1px solid var(--pos-primary, #1bb776); background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; font-size: 0.75rem; padding: 4px 12px; border-radius: 7px; cursor: pointer; }
.check-panel__serve-course:hover { background: var(--pos-primary-dark, #159f63); border-color: var(--pos-primary-dark, #159f63); }
.check-panel__empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #cbd5e0;
  text-align: center;
}
.check-panel__empty svg { width: 54px; height: 54px; margin-bottom: 10px; }
.check-panel__empty p { color: #94a3b8; margin: 0; }

.check-panel__foot { border-top: 1px solid #eef1f5; padding: 14px 18px 18px; }
.check-panel__totals { margin-bottom: 12px; }
.check-panel__total-row { display: flex; justify-content: space-between; padding: 3px 0; color: #64748b; }
.check-panel__discount { color: #ef4444; font-weight: 600; }
.check-panel__discount-remove { border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0 2px; }
.check-panel__discount-remove:hover { color: #ef4444; }
.check-panel__total-row--grand { font-size: 1.4rem; font-weight: 800; color: var(--pos-ink, #292c34); padding-top: 6px; }

.check-panel__send {
  width: 100%;
  height: 48px;
  border: 1px solid var(--pos-primary, #1bb776);
  background: rgba(27, 183, 118, 0.1);
  color: var(--pos-primary-dark, #159f63);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  margin-bottom: 10px;
}
.check-panel__send:hover { background: var(--pos-primary, #1bb776); color: #fff; }
.check-panel__send svg { width: 18px; height: 18px; }

.check-panel__actions { display: flex; gap: 8px; margin-bottom: 10px; }
.check-panel__action {
  flex: 1;
  height: 46px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 10px;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.check-panel__action:disabled { opacity: 0.5; cursor: not-allowed; }
.check-panel__action--icon { flex: 0 0 46px; font-size: 1.3rem; }
/* The "turn the bill into a return" action: red = money leaves the till. */
.check-panel__action--negative {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
  font-weight: 700;
  font-size: 0.88rem;
  padding: 0 4px;
}

.check-panel__pay {
  width: 100%;
  height: 64px;
  border: none;
  border-radius: 14px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  font-size: 1.2rem;
  font-weight: 800;
  cursor: pointer;
}
.check-panel__pay:disabled { background: #cbd5e0; cursor: not-allowed; }
.check-panel__pay-amount { font-variant-numeric: tabular-nums; }
</style>
