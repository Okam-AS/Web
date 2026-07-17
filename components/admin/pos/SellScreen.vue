<template>
  <div class="sell" :class="{ 'sell--training': pos.trainingMode }">
    <div v-if="pos.trainingMode" class="sell__training-banner">{{ $i('pos_training_banner') }}</div>
    <div class="sell__grid">
      <ProductGrid
        ref="grid"
        :categories="catalog"
        :catalog-error="catalogError"
        :sold-out-product-ids="soldOutProductIds"
        :sold-out-category-ids="soldOutCategoryIds"
        :delivery-type="effectiveDeliveryType"
        :current-course="currentCourse"
        :coursing-enabled="coursingEnabled"
        :current-seat="currentSeat"
        :seating-enabled="seatingEnabled"
        :seat-chip-count="seatChipCount"
        :seat-counts="seatCounts"
        :seat-removable="seatRemovable"
        @select="onSelect"
        @scan="onScan"
        @set-delivery="setDelivery"
        @set-course="currentCourse = $event"
        @set-seat="currentSeat = $event"
        @add-seat="onAddSeat"
        @remove-seat="onRemoveSeat"
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
      :seating="seatingEnabled"
      @show-parked="showParked = true"
      @open-price="showOpenPrice = true"
      @inc="onInc"
      @dec="onDec"
      @remove="onRemove"
      @park="onPark"
      @discount="onDiscount"
      @remove-discount="onRemoveDiscount"
      @line-discount="onLineDiscount"
      @line-remove-discount="onRemoveLineDiscount"
      @negative-sale="onNegativeSale"
      @fire-course="onFireCourse"
      @serve="onServeLine"
      @serve-course="onServeCourse"
      @send-to-kitchen="onSendToKitchen"
      @set-couverts="onSetCouverts"
      @note="onNote"
      @seat="onSeat"
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
      :presets="openPricePresets"
      :vat-context="effectiveDeliveryType"
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

    <SeatPickerModal
      v-if="seatGroup"
      :target-name="seatGroup.name"
      :initial-seat="seatGroup.seatNumber"
      :couverts="check && check.couverts ? check.couverts : 0"
      :max-seat="maxSeatOnCheck"
      :busy="busy"
      @confirm="onSeatConfirm"
      @close="seatGroup = null"
    />

    <PaymentScreen
      v-if="showPayment"
      :check="check"
      @close="showPayment = false"
      @done="onPaymentDone"
    />

    <DiscountModal
      v-if="showDiscount"
      :reasons="discountReasonsForScope"
      :scope="discountScope"
      :target-name="discountTargetName"
      :busy="discountBusy"
      :error="discountError"
      @confirm="onDiscountConfirm"
      @close="showDiscount = false"
    />

    <VoidModal
      v-if="showVoid"
      :busy="voidBusy"
      :error="voidError"
      @confirm="onVoidConfirm"
      @close="showVoid = false"
    />

    <ReturnBuilder
      v-if="showNegativeSale"
      title-key="pos_negative_sale"
      :initial-lines="negativeSalePrefill"
      @done="onNegativeSaleDone"
      @close="showNegativeSale = false; negativeSalePrefill = null"
    />

    <!-- ⋮ action sheet -->
    <div v-if="showMore" class="sell__more" @click.self="showMore = false">
      <div class="sell__more-sheet">
        <button type="button" class="sell__more-item" :disabled="busy || !checkHasLines" @click="onProvisional">
          {{ $i('pos_print_bill') }}
        </button>
        <button v-if="hasFloorTables" type="button" class="sell__more-item" :disabled="busy" @click="openMoveMerge">
          {{ $i('pos_move_merge') }}
        </button>
        <button type="button" class="sell__more-item" @click="onToggleTraining">
          {{ pos.trainingMode ? $i('pos_training_off') : $i('pos_training_on') }}
        </button>
        <button type="button" class="sell__more-item sell__more-item--danger" @click="onVoid">
          {{ $i('pos_void_check') }}
        </button>
        <button type="button" class="sell__more-item sell__more-cancel" @click="showMore = false">
          {{ $i('common_cancel') }}
        </button>
      </div>
    </div>

    <!-- Move the check to another table, or merge another table's check onto this one. Tapping a
         free table moves; tapping an occupied one merges that check's lines here. -->
    <div v-if="showMoveMerge" class="sell__movemerge" @click.self="showMoveMerge = false">
      <div class="sell__movemerge-panel">
        <h3 class="sell__movemerge-title">{{ $i('pos_move_merge') }}</h3>
        <p class="sell__movemerge-hint">{{ $i('pos_move_merge_hint') }}</p>
        <div class="sell__movemerge-list">
          <button
            v-for="t in moveMergeTables"
            :key="t.tableId"
            type="button"
            class="sell__movemerge-table"
            :class="{ 'is-occupied': !!t.openCheck }"
            :disabled="busy"
            @click="t.openCheck ? onMerge(t) : onMove(t)"
          >
            <span class="sell__movemerge-name">{{ t.name || ($i('pos_table') + ' ' + t.tableNumber) }}</span>
            <span class="sell__movemerge-act">{{ t.openCheck ? $i('pos_merge_here') : $i('pos_move_here') }}</span>
          </button>
          <p v-if="!moveMergeTables.length" class="sell__movemerge-empty">{{ $i('pos_move_merge_empty') }}</p>
        </div>
        <button type="button" class="sell__movemerge-cancel" @click="showMoveMerge = false">{{ $i('common_cancel') }}</button>
      </div>
    </div>

    <!-- An unpaid document: the provisional bill (PROREC, "regning" before payment) or a training
         sale (TRAINREC). Neither is proof of purchase, and neither settles the check. -->
    <div v-if="unpaidReceipt" class="sell__proforma" @click.self="unpaidReceipt = null">
      <div class="sell__proforma-panel">
        <PosReceiptView ref="proformaView" :receipt="unpaidReceipt" />
        <div class="sell__proforma-actions">
          <button type="button" class="sell__proforma-close" @click="unpaidReceipt = null">{{ $i('common_close') }}</button>
          <button type="button" class="sell__proforma-print" @click="printProvisional">{{ $i('pos_receipt_print') }}</button>
        </div>
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
import SeatPickerModal from '~/components/admin/pos/SeatPickerModal.vue';
import ReturnBuilder from '~/components/admin/pos/ReturnBuilder.vue';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';

// The sales screen: product grid on the left, open check on the right. It orchestrates adding lines
// (direct, options, open price, EAN), quantity changes and hands off to payment. The check itself
// lives on the shell so it survives switching to Board mode and back. Splitting a bill lives on the
// payment screen (not here), so a single tap on Pay reaches every way to settle.
export default {
  name: 'SellScreen',
  components: { ProductGrid, CheckPanel, OptionPicker, OpenPriceModal, PaymentScreen, DiscountModal, VoidModal, LineNoteModal, SeatPickerModal, ReturnBuilder, PosReceiptView },
  inject: ['pos'],
  data () {
    return {
      deliveryType: 'TableDelivery',
      currentCourse: null,
      // Active guest for new lines (null = Felles / shared), mirroring currentCourse. seatExtra holds
      // any chip added past the couverts/seat-derived count via the grid's "+" (an unexpected guest).
      currentSeat: null,
      seatExtra: 0,
      // The check group whose guest is being edited (opens SeatPickerModal); null when closed.
      seatGroup: null,
      optionProduct: null,
      showOpenPrice: false,
      showPayment: false,
      showDiscount: false,
      discountBusy: false,
      discountError: '',
      // 'order' or 'line'; when 'line', discountGroup is the grouped row being discounted.
      discountScope: 'order',
      discountGroup: null,
      showVoid: false,
      voidBusy: false,
      voidError: '',
      showMore: false,
      showMoveMerge: false,
      // The unpaid document shown for print (a provisional bill PROREC or a training sale TRAINREC);
      // null when closed. Neither settles the check.
      unpaidReceipt: null,
      showNegativeSale: false,
      // Return lines mapped from the selected bill rows; null when the builder starts empty.
      negativeSalePrefill: null,
      showParked: false,
      // The check group whose note is being edited (opens LineNoteModal); null when closed.
      noteGroup: null,
      goodsGroups: [],
      openPricePresets: [],
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
    // The delivery (VAT) context shown on the toggle: the open check's own once one exists (it is
    // server state and survives park/resume), the local pick before the first item.
    effectiveDeliveryType () {
      return this.check ? this.check.deliveryType : this.deliveryType;
    },
    // Coursing (the course selector, line status, "Send til kjøkken") is a table-service concept;
    // a quick sale has no tableId, so it is build -> pay with no kitchen round.
    coursingEnabled () { return !!(this.check && this.check.tableId); },
    // Guest tagging is opt-in and only surfaces once it is meaningful: a coursing (table) check that
    // either has guests set or already carries seated lines. A waiter who never sets guests sees it
    // never, so the flow is byte-identical to today.
    seatingEnabled () {
      if (!this.coursingEnabled) { return false; }
      const couverts = (this.check && this.check.couverts) || 0;
      return couverts >= 2 || this.checkItems.some(i => i.seatNumber != null);
    },
    checkItems () { return (this.check && this.check.items) || []; },
    checkHasLines () { return this.checkItems.length > 0; },
    discountTargetName () { return this.discountGroup ? this.discountGroup.name : ''; },
    // A product-restricted discount is only offered for a row whose product passes the restriction
    // (the backend enforces the same rule). Order scope shows every reason; the backend narrows a
    // product-restricted one to the eligible lines.
    discountReasonsForScope () {
      if (this.discountScope !== 'line' || !this.discountGroup) { return this.discountReasons; }
      // An open-price row has no product (empty guid), so product-restricted reasons never apply
      // to it — mirroring the backend rule.
      const productId = this.discountGroup.productId;
      const hasProduct = !!productId && productId !== '00000000-0000-0000-0000-000000000000';
      return this.discountReasons.filter((r) => {
        if (r.applicability !== 'ProductsInclusive' && r.applicability !== 'ProductsExclusive') { return true; }
        if (!hasProduct) { return false; }
        const listed = (r.discountProducts || []).some(p => p.productId === productId);
        return r.applicability === 'ProductsInclusive' ? listed : !listed;
      });
    },
    boardTables () { return (this.pos.boardStatus && this.pos.boardStatus.tables) || []; },
    hasFloorTables () { return this.boardTables.some(t => t.isActive); },
    // Tables the current check can move to (free) or merge with (occupied), excluding its own table.
    moveMergeTables () {
      const currentTableId = this.check ? this.check.tableId : null;
      return this.boardTables.filter(t => t.isActive && t.tableId !== currentTableId);
    },
    // Highest guest number already tagged on the check (0 when none), so chip rows always reach it.
    maxSeatOnCheck () {
      return this.checkItems.reduce((m, i) => (i.seatNumber != null && i.seatNumber > m ? i.seatNumber : m), 0);
    },
    // Numbered guest chips to render: enough for the couverts, any seat already used, and any extra
    // guest the operator added via "+". Capped at 20 to keep the row sane.
    seatChipCount () {
      const base = Math.max((this.check && this.check.couverts) || 0, this.maxSeatOnCheck, this.seatExtra);
      return Math.min(base, 20);
    },
    // The floor of guest chips that must always exist: the party size (couverts) and any guest that
    // already carries orders. Chips above this floor are extras added via "+"; only those can be
    // removed, so a guest with items or within the party size can never be cleared away by mistake.
    seatFloor () {
      return Math.max((this.check && this.check.couverts) || 0, this.maxSeatOnCheck);
    },
    // A "−" is offered only when the top chip is such a removable extra.
    seatRemovable () {
      return this.seatChipCount > this.seatFloor;
    },
    // Item count per guest, so a chip can show who already has orders at a glance.
    seatCounts () {
      const counts = {};
      this.checkItems.forEach((i) => {
        if (i.seatNumber != null) { counts[i.seatNumber] = (counts[i.seatNumber] || 0) + i.quantity; }
      });
      return counts;
    },
    catalog () { return this.pos.catalog || []; },
    catalogError () { return this.pos.catalogError; },
    board () { return this.pos.boardStatus; },
    parkedChecks () { return (this.board && this.board.parkedChecks) || []; },
    soldOutProductIds () { return (this.board && this.board.soldOutProductIds) || []; },
    soldOutCategoryIds () { return (this.board && this.board.soldOutCategoryIds) || []; },
    // The robust reset hook: the active guest is per-check ambient state, so it clears whenever the
    // check changes — a new/resumed check, or the check going away on park, void or payment.
    checkId () { return this.check ? this.check.orderId : null; }
  },
  watch: {
    checkId () {
      this.currentSeat = null;
      this.seatExtra = 0;
    }
  },
  mounted () {
    this.loadGoodsGroups();
    this.loadOpenPricePresets();
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
    async loadOpenPricePresets () {
      try {
        this.openPricePresets = (await this.pos.openPricePresetSvc().GetForStore(this.pos.storeId) || []).filter(p => p.isActive !== false);
      } catch (e) {
        this.openPricePresets = [];
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
    // Switching eat-in / take-away is always allowed: before a check exists it just sets the
    // context for the next one; on an open check the server re-prices every line for the new VAT
    // context and returns the updated bill.
    async setDelivery (dt) {
      if (!this.check) {
        this.deliveryType = dt;
        return;
      }
      if (this.busy || this.check.deliveryType === dt) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().SetDeliveryType(this.check.orderId, { deliveryType: dt }));
        this.deliveryType = dt;
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // The whole bill becomes the return: ring the goods in on the ordinary grid, one tap, and the
    // § 5-3-7 settle flow takes over. Amounts, VAT and goods groups all come from the bill rows —
    // nothing is re-entered.
    onNegativeSale (groups) {
      this.negativeSalePrefill = groups.map((g) => {
        const optionNames = (g.options || []).map(o => o.name).filter(Boolean);
        const name = optionNames.length ? g.name + ' (' + optionNames.join(', ') + ')' : g.name;
        // A discounted row refunds exactly what was charged: one unit at the discounted total
        // (the per-unit net may not divide evenly in ore).
        if (g.discountAmount > 0) {
          return {
            name,
            quantity: 1,
            unitAmount: g.lineAmount - g.discountAmount,
            vatPercent: g.tax,
            goodsGroupId: g.goodsGroupId,
            sourceLineIds: g.lineIds.slice()
          };
        }
        return {
          name,
          quantity: g.quantity,
          unitAmount: g.unitAmount,
          vatPercent: g.tax,
          goodsGroupId: g.goodsGroupId,
          sourceLineIds: g.lineIds.slice()
        };
      });
      this.showNegativeSale = true;
    },
    // The RETREC is journalled; the bill was returned in full, so every rung line comes off the
    // check again (leaving it empty and ready for the next customer).
    async onNegativeSaleDone (_receipt, lines) {
      this.showNegativeSale = false;
      this.negativeSalePrefill = null;
      const lineIds = (lines || []).flatMap(l => l.sourceLineIds || []);
      if (this.check && lineIds.length) {
        this.busy = true;
        try {
          let result = this.check;
          for (const lineId of lineIds) {
            result = await this.pos.checkSvc().RemoveLine(this.check.orderId, lineId);
          }
          this.pos.applyCheck(result);
        } catch (e) {
          this.notify(this.pos.errMsg(e), 'error');
          this.busy = false;
          return;
        }
        this.busy = false;
      }
      this.notify(this.$i('pos_negative_sale_done'), 'success');
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
    async addProduct (product, selectedOptionIds, quantity, seatOverride) {
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.ensureCheck();
        // seatOverride (used by "+" on a row) forces the row's own guest; otherwise a new line takes
        // the active guest. undefined means "not overridden" so an explicit null (Felles) is honoured.
        const seatNumber = seatOverride !== undefined
          ? seatOverride
          : (this.seatingEnabled ? this.currentSeat : null);
        const request = {
          quantity: 1,
          notes: '',
          courseSequence: this.coursingEnabled ? this.currentCourse : null,
          seatNumber,
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
        // The active guest is a per-line choice, not a sticky mode: after a line lands it falls back
        // to Felles so the next item is never silently tagged to the previous guest. A row-repeat
        // ("+" on a check line) passes an explicit seatOverride and must not disturb the selection.
        if (seatOverride === undefined) { this.currentSeat = null; }
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    async onOpenPriceConfirm ({ name, amount, tax, goodsGroupId, openPricePresetId }) {
      this.showOpenPrice = false;
      if (this.busy) { return; }
      this.busy = true;
      try {
        const check = await this.ensureCheck();
        // A preset carries its own name + goods group server-side (WP-A2); a custom open-price line
        // sends the typed name / group / rate. Only one path is populated.
        const request = {
          quantity: 1,
          notes: '',
          courseSequence: this.coursingEnabled ? this.currentCourse : null,
          seatNumber: this.seatingEnabled ? this.currentSeat : null,
          productId: null,
          selectedOptionIds: [],
          isOpenPrice: true,
          name: name || null,
          amount,
          tax: tax || 0,
          goodsGroupId: goodsGroupId || null,
          openPricePresetId: openPricePresetId || null
        };
        this.recipes['o|' + (openPricePresetId ? 'p' + openPricePresetId : name) + '|' + amount + '|' + (tax || 0)] = request;
        this.pos.applyCheck(await this.pos.checkSvc().AddLine(check.orderId, request));
        // Fall back to Felles after the line lands, as for a product line.
        this.currentSeat = null;
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
      // "+" adds one more of this exact row, so the new line inherits the row's guest — never the
      // stale recipe seat and never the currently active guest.
      const rowSeat = group.seatNumber != null ? group.seatNumber : null;
      // Simple catalog line: rebuild straight from the catalog.
      if (!group.isOpenPrice && (!group.options || !group.options.length)) {
        const product = this.findCatalogProduct(group.productId);
        if (product) { return this.addProduct(product, [], 1, rowSeat); }
      }
      const key = group.isOpenPrice
        ? 'o|' + group.name + '|' + group.unitAmount + '|' + group.tax
        : 'p|' + group.productId + '|' + group.options.map(o => o.name).slice().sort().join(',');
      const recipe = this.recipes[key];
      this.busy = true;
      try {
        if (recipe) {
          this.pos.applyCheck(await this.pos.checkSvc().AddLine(this.check.orderId, { ...recipe, seatNumber: rowSeat }));
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
      this.discountScope = 'order';
      this.discountGroup = null;
      this.discountError = '';
      this.showDiscount = true;
    },
    // Discount a single grouped row (all its member lines).
    onLineDiscount (group) {
      if (!this.check || !group || !group.lineIds.length) { return; }
      this.discountScope = 'line';
      this.discountGroup = group;
      this.discountError = '';
      this.showDiscount = true;
    },
    async onDiscountConfirm (request) {
      this.discountBusy = true;
      this.discountError = '';
      try {
        if (this.discountScope === 'line' && this.discountGroup) {
          // One call for the whole visible row: a percentage is taken off each member line, a
          // fixed amount is granted once and split across them server-side.
          this.pos.applyCheck(await this.pos.checkSvc().ApplyLineDiscount(this.check.orderId, { lineIds: this.discountGroup.lineIds, ...request }));
        } else {
          this.pos.applyCheck(await this.pos.checkSvc().ApplyOrderDiscount(this.check.orderId, request));
        }
        this.showDiscount = false;
        this.notify(this.$i('pos_discount_applied'), 'success');
      } catch (e) {
        this.discountError = this.pos.errMsg(e);
      } finally {
        this.discountBusy = false;
      }
    },
    async onRemoveLineDiscount (group) {
      if (!this.check || this.busy || !group || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        let result = this.check;
        for (const lineId of group.lineIds) {
          result = await this.pos.checkSvc().RemoveLineDiscount(this.check.orderId, lineId);
        }
        this.pos.applyCheck(result);
        this.notify(this.$i('pos_discount_removed'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
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
    // The grid's "+" adds a chip one past the current count and selects it — an unexpected extra
    // guest. It does not touch couverts (the party size stays what the operator set).
    onAddSeat () {
      const next = this.seatChipCount + 1;
      if (next > 20) { return; }
      this.seatExtra = next;
      this.currentSeat = next;
    },
    // The grid's "−" removes the top guest chip when it is a removable extra (above the party size
    // and carrying no orders). If that chip was the active guest, the selection falls back to Felles
    // so a new line never lands on a guest that no longer exists.
    onRemoveSeat () {
      if (!this.seatRemovable) { return; }
      const removed = this.seatChipCount;
      this.seatExtra = removed - 1;
      if (this.currentSeat != null && this.currentSeat >= removed) {
        this.currentSeat = null;
      }
    },
    // Opens the guest picker for a line group's tag. Table checks only (seating is a coursing concept).
    onSeat (group) {
      if (!this.check) { return; }
      this.seatGroup = group;
    },
    async onSeatConfirm (seatNumber) {
      const group = this.seatGroup;
      this.seatGroup = null;
      if (!group || !this.check || this.busy || !group.lineIds.length) { return; }
      this.busy = true;
      try {
        // Seat is part of the group key, so set it on every member line to keep the row together
        // (the same reasoning as notes) — leaving members on different guests would split the row.
        let result = this.check;
        for (const lineId of group.lineIds) {
          result = await this.pos.checkSvc().SetLineSeat(this.check.orderId, lineId, seatNumber);
        }
        this.pos.applyCheck(result);
        this.notify(this.$i('pos_seat_saved'), 'success');
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
    // Produce a provisional bill ("regning") for the customer before payment. It is a PROREC
    // (journalled, "not proof of purchase"), so it does not settle the check.
    async onProvisional () {
      this.showMore = false;
      if (!this.check || this.busy || !this.checkHasLines) { return; }
      this.busy = true;
      try {
        this.unpaidReceipt = await this.pos.posSvc().ProvisionalReceipt({
          cashPointId: this.pos.cashPoint.cashPointId,
          orderId: this.check.orderId,
          vatContext: this.effectiveDeliveryType
        });
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    printProvisional () {
      if (this.$refs.proformaView) { this.$refs.proformaView.print(); }
    },
    openMoveMerge () {
      this.showMore = false;
      if (!this.check) { return; }
      this.showMoveMerge = true;
    },
    // Move the check to a free table.
    async onMove (t) {
      if (this.busy || !this.check) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().Move(this.check.orderId, { tableId: t.tableId }));
        this.showMoveMerge = false;
        this.notify(this.$i('pos_moved'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
    },
    // Merge an occupied table's check onto this one (the source check is consumed).
    async onMerge (t) {
      if (this.busy || !this.check || !t.openCheck) { return; }
      this.busy = true;
      try {
        this.pos.applyCheck(await this.pos.checkSvc().Merge(this.check.orderId, { sourceOrderId: t.openCheck.orderId }));
        this.showMoveMerge = false;
        this.notify(this.$i('pos_merged'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.busy = false;
      }
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
    onToggleTraining () {
      this.showMore = false;
      this.pos.toggleTrainingMode();
    },
    async onPay () {
      if (!this.check) { return; }
      // In training mode a "sale" produces a TRAINREC (counted only in the X/Z training totals)
      // instead of taking real money. It does not settle the check — the trainee can ring more
      // practice sales or clear it — so the banner keeps it unmistakably a rehearsal.
      if (this.pos.trainingMode) {
        if (this.busy || !this.checkHasLines) { return; }
        this.busy = true;
        try {
          this.unpaidReceipt = await this.pos.posSvc().TrainingReceipt({
            cashPointId: this.pos.cashPoint.cashPointId,
            orderId: this.check.orderId,
            vatContext: this.effectiveDeliveryType
          });
        } catch (e) {
          this.notify(this.pos.errMsg(e), 'error');
        } finally {
          this.busy = false;
        }
        return;
      }
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
/* Training mode: a persistent amber frame + top strip so a rehearsal can never be mistaken for a
   real shift. The strip does not intercept taps. */
.sell--training { box-shadow: inset 0 0 0 3px #d97706; }
.sell__training-banner { position: absolute; top: 0; left: 0; right: 0; z-index: 1000; pointer-events: none; background: #d97706; color: #fff; text-align: center; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 5px; font-size: 0.8rem; }
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
.sell__more-item:disabled { color: #cbd5e0; cursor: not-allowed; }
.sell__proforma { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
.sell__proforma-panel { background: #ffffff; border-radius: 16px; width: 100%; max-width: 420px; max-height: 92vh; overflow-y: auto; padding: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.sell__proforma-actions { display: flex; gap: 10px; margin-top: 14px; }
.sell__proforma-close { flex: 1; height: 48px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 700; color: var(--pos-ink, #292c34); cursor: pointer; }
.sell__proforma-print { flex: 1; height: 48px; border: none; border-radius: 10px; background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; cursor: pointer; }
.sell__movemerge { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1200; padding: 16px; }
.sell__movemerge-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; max-height: 88vh; display: flex; flex-direction: column; padding: 18px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.sell__movemerge-title { margin: 0 0 4px; font-size: 1.15rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.sell__movemerge-hint { margin: 0 0 12px; font-size: 0.85rem; color: #64748b; }
.sell__movemerge-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.sell__movemerge-table { display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 16px; border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; cursor: pointer; }
.sell__movemerge-table.is-occupied { border-color: #f59e0b; background: rgba(245, 158, 11, 0.06); }
.sell__movemerge-table:disabled { opacity: 0.5; cursor: not-allowed; }
.sell__movemerge-name { font-weight: 700; color: var(--pos-ink, #292c34); }
.sell__movemerge-act { font-weight: 600; color: #64748b; }
.sell__movemerge-table.is-occupied .sell__movemerge-act { color: #b45309; }
.sell__movemerge-empty { text-align: center; color: #94a3b8; padding: 20px 0; }
.sell__movemerge-cancel { height: 48px; margin-top: 12px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 700; color: #64748b; cursor: pointer; }
</style>
