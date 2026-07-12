<template>
  <div class="sell">
    <div class="sell__grid">
      <ProductGrid
        ref="grid"
        :categories="catalog"
        :catalog-error="catalogError"
        :sold-out-product-ids="soldOutProductIds"
        :sold-out-category-ids="soldOutCategoryIds"
        :delivery-type="deliveryType"
        :delivery-locked="!!check"
        :current-course="currentCourse"
        :coursing-enabled="coursingEnabled"
        @select="onSelect"
        @open-price="showOpenPrice = true"
        @scan="onScan"
        @set-delivery="setDelivery"
        @set-course="currentCourse = $event"
        @reload-catalog="pos.loadCatalog()"
      />
    </div>

    <!-- Parked drawer -->
    <div v-if="showParked" class="sell__parked" @click.self="showParked = false">
      <div class="sell__parked-sheet">
        <header class="sell__parked-head">
          <h2 class="sell__parked-title">
            {{ $i('pos_parked_title') }}
          </h2>
          <button type="button" class="sell__parked-close" @click="showParked = false">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div class="sell__parked-list">
          <button
            v-for="p in parkedChecks"
            :key="p.orderId"
            type="button"
            class="sell__parked-card"
            :disabled="busy"
            @click="onResumeParked(p)"
          >
            <span class="sell__parked-card-name">{{ p.tableName || $i('pos_quick_sale') }}</span>
            <span class="sell__parked-card-meta">{{ parkedMeta(p) }}</span>
            <span class="sell__parked-card-amount">{{ priceLabel(p.finalAmount) }}</span>
          </button>
        </div>
      </div>
    </div>

    <CheckPanel
      :check="check"
      :parked-count="parkedChecks.length"
      @show-parked="showParked = true"
      @inc="onInc"
      @dec="onDec"
      @remove="onRemove"
      @park="onPark"
      @discount="onDiscount"
      @remove-discount="onRemoveDiscount"
      @fire-course="onFireCourse"
      @serve="onServeLine"
      @serve-course="onServeCourse"
      @send-to-kitchen="onSendToKitchen"
      @set-couverts="onSetCouverts"
      @note="onNote"
      @more="onMore"
      @pay="onPay"
    />

    <!-- Notice toast -->
    <transition name="sell-notice">
      <div
        v-if="notice.show"
        class="sell__notice"
        :class="'sell__notice--' + notice.type"
      >
        {{ notice.message }}
      </div>
    </transition>

    <OptionPicker
      v-if="optionProduct"
      :product="optionProduct"
      @confirm="onOptionConfirm"
      @close="optionProduct = null"
    />

    <OpenPriceModal
      v-if="showOpenPrice"
      :goods-groups="goodsGroups"
      @confirm="onOpenPriceConfirm"
      @close="showOpenPrice = false"
    />

    <LineNoteModal
      v-if="noteGroup"
      :initial-note="noteGroup.notes"
      :target-name="noteGroup.name"
      :busy="busy"
      @confirm="onNoteConfirm"
      @close="noteGroup = null"
    />

    <PaymentScreen
      v-if="showPayment"
      :check="check"
      @close="showPayment = false"
      @done="onPaymentDone"
    />

    <DiscountModal
      v-if="showDiscount"
      :reasons="discountReasons"
      :manager-operators="managerOperators"
      scope="order"
      :busy="discountBusy"
      :error="discountError"
      @confirm="onDiscountConfirm"
      @close="showDiscount = false"
    />

    <VoidModal
      v-if="showVoid"
      :manager-operators="managerOperators"
      :busy="voidBusy"
      :error="voidError"
      @confirm="onVoidConfirm"
      @close="showVoid = false"
    />

    <!-- ⋮ action sheet -->
    <div v-if="showMore" class="sell__more" @click.self="showMore = false">
      <div class="sell__more-sheet">
        <button type="button" class="sell__more-item sell__more-item--danger" @click="onVoid">
          {{ $i('pos_void_check') }}
        </button>
        <button type="button" class="sell__more-item sell__more-cancel" @click="showMore = false">
          {{ $i('common_cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import ProductGrid from '~/components/admin/pos/ProductGrid.vue';
import CheckPanel from '~/components/admin/pos/CheckPanel.vue';
import OptionPicker from '~/components/admin/pos/OptionPicker.vue';
import OpenPriceModal from '~/components/admin/pos/OpenPriceModal.vue';
import PaymentScreen from '~/components/admin/pos/PaymentScreen.vue';
import DiscountModal from '~/components/admin/pos/DiscountModal.vue';
import VoidModal from '~/components/admin/pos/VoidModal.vue';
import LineNoteModal from '~/components/admin/pos/LineNoteModal.vue';

// The sales screen: product grid on the left, open check on the right. It orchestrates adding lines
// (direct, options, open price, EAN), quantity changes and hands off to payment. The check itself
// lives on the shell so it survives switching to Board mode and back. Splitting a bill lives on the
// payment screen (not here), so a single tap on Pay reaches every way to settle.
export default {
  name: 'SellScreen',
  components: { ProductGrid, CheckPanel, OptionPicker, OpenPriceModal, PaymentScreen, DiscountModal, VoidModal, LineNoteModal },
  inject: ['pos'],
  data () {
    return {
      deliveryType: 'TableDelivery',
      currentCourse: null,
      optionProduct: null,
      showOpenPrice: false,
      showPayment: false,
      showDiscount: false,
      discountBusy: false,
      discountError: '',
      showVoid: false,
      voidBusy: false,
      voidError: '',
      showMore: false,
      showParked: false,
      // The check group whose note is being edited (opens LineNoteModal); null when closed.
      noteGroup: null,
      goodsGroups: [],
      discountReasons: [],
      busy: false,
      // Recipe map so "+" can re-add an option / open-price line whose ingredients aren't fully
      // recoverable from the server line (option ids, goods group). Keyed to match a check group.
      recipes: {},
      notice: { show: false, message: '', type: 'info' },
      noticeTimer: null
    };
  },
  computed: {
    check () { return this.pos.activeCheck; },
    // Coursing (the course selector, line status, "Send til kjøkken") is a table-service concept;
    // a quick sale has no tableId, so it is build -> pay with no kitchen round.
    coursingEnabled () { return !!(this.check && this.check.tableId); },
    catalog () { return this.pos.catalog || []; },
    catalogError () { return this.pos.catalogError; },
    board () { return this.pos.boardStatus; },
    parkedChecks () { return (this.board && this.board.parkedChecks) || []; },
    soldOutProductIds () { return (this.board && this.board.soldOutProductIds) || []; },
    soldOutCategoryIds () { return (this.board && this.board.soldOutCategoryIds) || []; },
    // Operators who can authorise manager-gated discounts and voids.
    managerOperators () {
      return (this.pos.operators || []).filter(o => o.roleLevel === 'Leder' || o.roleLevel === 'Eier');
    }
  },
  mounted () {
    this.loadGoodsGroups();
    this.loadDiscountReasons();
  },
  beforeDestroy () {
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
  },
  methods: {
    async loadGoodsGroups () {
      try {
        this.goodsGroups = await this.pos._goodsGroupService.GetForStore(this.pos.storeId) || [];
      } catch (e) {
        this.goodsGroups = [];
      }
    },
    // POS discounts are the store's catalogue discounts flagged ShowInPos (shared with the consumer
    // side), ordered by their POS sort order.
    async loadDiscountReasons () {
      try {
        this.discountReasons = (await this.pos._discountService.Get(this.pos.storeId) || [])
          .filter(r => r.showInPos && !r.expired)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      } catch (e) {
        this.discountReasons = [];
      }
    },
    notify (message, type = 'info') {
      this.notice = { show: true, message, type };
      if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
      this.noticeTimer = setTimeout(() => { this.notice.show = false; }, 3500);
    },
    setDelivery (dt) {
      if (this.check) { return; }
      this.deliveryType = dt;
    },

    // ---- Adding ----
    ensureCheck () {
      if (this.check) { return Promise.resolve(this.check); }
      return this.pos.openCheck({ deliveryType: this.deliveryType });
    },
    optionNames (product, selectedOptionIds) {
      const names = [];
      (product.productVariants || []).forEach((v) => {
        (v.options || []).forEach((o) => {
          if (selectedOptionIds.includes(o.id)) { names.push(o.name); }
        });
      });
      return names;
    },
    onSelect (product) {
      const hasOptions = product.productVariantEnabled &&
        Array.isArray(product.productVariants) && product.productVariants.length > 0;
      if (hasOptions) {
        this.optionProduct = product;
      } else {
        this.addProduct(product, [], 1);
      }
    },
    onOptionConfirm ({ selectedOptionIds, quantity }) {
      const product = this.optionProduct;
      this.optionProduct = null;
      this.addProduct(product, selectedOptionIds, quantity);
    },
    async addProduct (product, selectedOptionIds, quantity) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.ensureCheck();
        const request = {
          quantity: 1,
          notes: '',
          courseSequence: this.coursingEnabled ? this.currentCourse : null,
          productId: product.id,
          selectedOptionIds: selectedOptionIds || [],
          isOpenPrice: false,
          name: null,
          amount: 0,
          tax: 0,
          goodsGroupId: null
        };
        if (selectedOptionIds && selectedOptionIds.length) {
          const names = this.optionNames(product, selectedOptionIds);
          this.recipes['p|' + product.id + '|' + names.slice().sort().join(',')] = request;
        }
        let result = check;
        for (let i = 0; i < Math.max(1, quantity); i++) {
          result = await this.pos.checkSvc().AddLine(check.orderId, request);
        }
        this.pos.applyCheck(result);
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onOpenPriceConfirm ({ name, amount, tax, goodsGroupId }) {
      this.showOpenPrice = false;
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.ensureCheck();
        const request = {
          quantity: 1,
          notes: '',
          courseSequence: this.coursingEnabled ? this.currentCourse : null,
          productId: null,
          selectedOptionIds: [],
          isOpenPrice: true,
          name,
          amount,
          tax,
          goodsGroupId
        };
        this.recipes['o|' + name + '|' + amount + '|' + tax] = request;
        this.pos.applyCheck(await this.pos.checkSvc().AddLine(check.orderId, request));
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onScan (barcode) {
      if (this.busy) { return; }
      try {
        const product = await this.pos._productService.GetByBarcode(this.pos.storeId, barcode);
        if (!product || !product.id) {
          this.notify(this.$i('pos_barcode_not_found', { code: barcode }), 'error');
          return;
        }
        this.onSelect(product);
      } catch (e) {
        this.notify(this.$i('pos_barcode_not_found', { code: barcode }), 'error');
      }
    },

    // ---- Quantity ----
    async onInc (group) {
      if (this.busy) { return; }
      // Simple catalog line: rebuild straight from the catalog.
      if (!group.isOpenPrice && (!group.options || !group.options.length)) {
        const product = this.findCatalogProduct(group.productId);
        if (product) { return this.addProduct(product, [], 1); }
      }
      const key = group.isOpenPrice
        ? 'o|' + group.name + '|' + group.unitAmount + '|' + group.tax
        : 'p|' + group.productId + '|' + group.options.map(o => o.name).slice().sort().join(',');
      const recipe = this.recipes[key];
      this.busy = true;
      try {
        if (recipe) {
          this.pos.applyCheck(await this.pos.checkSvc().AddLine(this.check.orderId, recipe));
        } else if (group.lineIds.length) {
          // No client-side recipe (resumed or refreshed check): copy the existing line server-side.
          const lineId = group.lineIds[group.lineIds.length - 1];
          this.pos.applyCheck(await this.pos.checkSvc().DuplicateLine(this.check.orderId, lineId));
        }
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onDec (group) {
      if (this.busy || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        const lineId = group.lineIds[group.lineIds.length - 1];
        this.pos.applyCheck(await this.pos.checkSvc().RemoveLine(this.check.orderId, lineId));
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onRemove (group) {
      if (this.busy || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        let result = this.check;
        for (const lineId of group.lineIds) {
          result = await this.pos.checkSvc().RemoveLine(this.check.orderId, lineId);
        }
        this.pos.applyCheck(result);
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    findCatalogProduct (productId) {
      for (const cat of this.catalog) {
        const items = cat.categoryProductListItems || [];
        for (const item of items) {
          if (item.product && item.product.id === productId) { return item.product; }
        }
      }
      return null;
    },

    // ---- Check actions ----
    async onPark () {
      if (!this.check || this.busy) { return; }
      this.busy = true;
      try {
        await this.pos.checkSvc().Park(this.check.orderId);
        this.pos.clearActiveCheck();
        // Reflect the new parked check immediately; the next board poll confirms it.
        this.pos.refreshBoard();
        this.notify(this.$i('pos_parked'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Time + line count so several parked quick sales can be told apart.
    parkedMeta (p) {
      const parts = [];
      if (p.created) {
        const d = new Date(p.created);
        parts.push(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
      }
      if (p.lineCount != null) { parts.push(this.$i('pos_parked_lines', { count: p.lineCount })); }
      return parts.join(' · ');
    },
    async onResumeParked (p) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.pos.checkSvc().Resume(p.orderId, { tableId: p.tableId || null });
        this.showParked = false;
        this.pos.setActiveCheck(check);
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    onDiscount () {
      if (!this.check) { return; }
      this.discountError = '';
      this.showDiscount = true;
    },
    async onDiscountConfirm (request) {
      this.discountBusy = true;
      this.discountError = '';
      try {
        this.pos.applyCheck(await this.pos.checkSvc().ApplyOrderDiscount(this.check.orderId, request));
        this.showDiscount = false;
        this.notify(this.$i('pos_discount_applied'), 'success');
      } catch (e) {
        this.discountError = this.pos.errMsg(e);
      } finally {
        this.discountBusy = false;
      }
    },
    async onRemoveDiscount () {
      if (!this.check || this.busy) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().RemoveOrderDiscount(this.check.orderId));
        this.notify(this.$i('pos_discount_removed'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onSetCouverts (couverts) {
      if (!this.check || this.busy) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().SetCouverts(this.check.orderId, { couverts }));
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onFireCourse (courseSequence) {
      if (!this.check || this.busy) { return; }
      const lineIds = this.check.items
        .filter(i => (i.courseSequence || null) === (courseSequence || null))
        .map(i => i.orderLineItemId);
      if (!lineIds.length) { return; }
      this.busy = true;
      try {
        let result = null;
        for (const lineId of lineIds) {
          result = await this.pos.checkSvc().FireLine(this.check.orderId, lineId, { status: 'Fired', capture: false, paymentTransactionId: null });
        }
        this.pos.applyCheck((result && result.check) || this.check);
        this.notify(this.$i('pos_course_fired'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Marks a single line group as served. Only fired/ready lines are offered a serve button, so the
    // group's members are all at least fired; each is moved to Served (no capture, no fiscal effect —
    // the same FireLine path the kitchen loop uses).
    async onServeLine (group) {
      if (!this.check || this.busy || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        let result = null;
        for (const lineId of group.lineIds) {
          result = await this.pos.checkSvc().FireLine(this.check.orderId, lineId, { status: 'Served', capture: false, paymentTransactionId: null });
        }
        this.pos.applyCheck((result && result.check) || this.check);
        this.notify(this.$i('pos_line_served'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Serves a whole course at once (mirrors onFireCourse): every fired/ready line in the course is
    // moved to Served. Pending/Sent lines in the course are skipped — you cannot serve unfired food.
    async onServeCourse (courseSequence) {
      if (!this.check || this.busy) { return; }
      const lineIds = this.check.items
        .filter(i => (i.courseSequence || null) === (courseSequence || null))
        .filter(i => i.status === 'Fired' || i.status === 'Ready')
        .map(i => i.orderLineItemId);
      if (!lineIds.length) { return; }
      this.busy = true;
      try {
        let result = null;
        for (const lineId of lineIds) {
          result = await this.pos.checkSvc().FireLine(this.check.orderId, lineId, { status: 'Served', capture: false, paymentTransactionId: null });
        }
        this.pos.applyCheck((result && result.check) || this.check);
        this.notify(this.$i('pos_course_served'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Sends every new ("Ny") line to the kitchen in one call; the server moves the kitchen-print
    // relevant Pending lines to Sent and leaves the rest. Items added afterwards are "Ny" again.
    async onSendToKitchen () {
      if (!this.check || this.busy) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().SendToKitchen(this.check.orderId));
        this.notify(this.$i('pos_send_to_kitchen'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Opens the note editor for a line group. A note per item is useful on every check, so this is
    // available for quick sales and table checks alike.
    onNote (group) {
      if (!this.check) { return; }
      this.noteGroup = group;
    },
    async onNoteConfirm (notes) {
      const group = this.noteGroup;
      this.noteGroup = null;
      if (!group || !this.check || this.busy || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        // A visible row is one group that may be backed by several underlying line ids (a quantity
        // built from several adds). Set the note on every member so the whole row carries it and the
        // lines stay grouped together — notes is part of the group key, so leaving members with
        // different notes would split the row.
        let result = this.check;
        for (const lineId of group.lineIds) {
          result = await this.pos.checkSvc().SetLineNote(this.check.orderId, lineId, notes);
        }
        this.pos.applyCheck(result);
        this.notify(this.$i('pos_note_saved'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    onMore () {
      if (!this.check) { return; }
      this.showMore = true;
    },
    onVoid () {
      this.showMore = false;
      this.voidError = '';
      this.showVoid = true;
    },
    async onVoidConfirm (request) {
      this.voidBusy = true;
      this.voidError = '';
      try {
        await this.pos.checkSvc().VoidCheck(this.check.orderId, request);
        this.showVoid = false;
        this.pos.clearActiveCheck();
        this.recipes = {};
        this.notify(this.$i('pos_voided'), 'success');
      } catch (e) {
        this.voidError = this.pos.errMsg(e);
      } finally {
        this.voidBusy = false;
      }
    },
    onPay () {
      if (!this.check) { return; }
      this.showPayment = true;
    },
    onPaymentDone () {
      this.showPayment = false;
      this.pos.clearActiveCheck();
      this.recipes = {};
    }
  }
};
</script>

<style scoped>
.sell {
  position: absolute;
  inset: 0;
  display: flex;
  min-height: 0;
}
.sell__grid { flex: 1; min-width: 0; }

.sell__parked {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.55);
  display: flex;
  justify-content: flex-end;
  z-index: 1150;
}
.sell__parked-sheet { width: 100%; max-width: 400px; background: #f8f9fa; height: 100%; display: flex; flex-direction: column; box-shadow: -8px 0 30px rgba(0, 0, 0, 0.25); }
.sell__parked-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.sell__parked-title { font-size: 1.2rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.sell__parked-close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.sell__parked-close svg { width: 24px; height: 24px; }
.sell__parked-list { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.sell__parked-card {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'name amount' 'meta amount';
  gap: 2px 12px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #94a3b8;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}
.sell__parked-card:disabled { opacity: 0.6; cursor: default; }
.sell__parked-card-name { grid-area: name; font-weight: 700; color: var(--pos-ink, #292c34); }
.sell__parked-card-meta { grid-area: meta; font-size: 0.78rem; color: #64748b; }
.sell__parked-card-amount { grid-area: amount; font-weight: 800; color: var(--pos-primary-dark, #159f63); font-size: 1.05rem; }

.sell__notice {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 22px;
  border-radius: 12px;
  font-weight: 600;
  color: #ffffff;
  z-index: 700;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.sell__notice--info { background: #334155; }
.sell__notice--success { background: var(--pos-primary-dark, #159f63); }
.sell__notice--error { background: #ef4444; }

.sell-notice-enter-active, .sell-notice-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.sell-notice-enter, .sell-notice-leave-to { opacity: 0; transform: translate(-50%, -8px); }

.sell__more {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.sell__more-sheet { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 8px; }
.sell__more-item {
  height: 56px;
  border: none;
  border-radius: 12px;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
}
.sell__more-item--danger { color: #ef4444; }
.sell__more-cancel { color: #64748b; }
</style>
