<template>
  <div class="product-grid">
    <!-- Header: search + delivery (VAT) context -->
    <div class="product-grid__head">
      <div class="product-grid__search">
        <svg class="product-grid__search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          ref="search"
          v-model="query"
          type="text"
          class="product-grid__search-input"
          :placeholder="$i('pos_search_placeholder')"
          @keyup.enter="onEnter"
        >
        <button v-if="query" type="button" class="product-grid__search-clear" @click="query = ''">
          ×
        </button>
      </div>

      <div class="product-grid__delivery">
        <button
          type="button"
          class="product-grid__delivery-btn"
          :class="{ 'is-active': deliveryType === 'TableDelivery' }"
          @click="$emit('set-delivery', 'TableDelivery')"
        >
          {{ $i('pos_eat_in') }}
        </button>
        <button
          type="button"
          class="product-grid__delivery-btn"
          :class="{ 'is-active': deliveryType === 'SelfPickup' }"
          @click="$emit('set-delivery', 'SelfPickup')"
        >
          {{ $i('pos_takeaway') }}
        </button>
      </div>
    </div>

    <!-- Course context (new lines are placed on the selected course). Table checks only; a quick
         sale has no coursing. -->
    <div v-if="coursingEnabled" class="product-grid__course">
      <span class="product-grid__course-label">{{ $i('pos_course') }}</span>
      <button
        type="button"
        class="product-grid__course-btn"
        :class="{ 'is-active': currentCourse === null }"
        @click="$emit('set-course', null)"
      >
        {{ $i('pos_course_none') }}
      </button>
      <button
        v-for="n in 3"
        :key="n"
        type="button"
        class="product-grid__course-btn"
        :class="{ 'is-active': currentCourse === n }"
        @click="$emit('set-course', n)"
      >
        {{ n }}
      </button>
    </div>

    <!-- Guest (seat) context: new lines are tagged to the selected guest, mirroring coursing. Only
         shown once seating is in play (a table with guests, or a check that already carries seats),
         so a waiter who ignores it has an unchanged flow. -->
    <div v-if="seatingEnabled" class="product-grid__seat">
      <span class="product-grid__seat-label">{{ $i('pos_seat_label') }}</span>
      <button
        type="button"
        class="product-grid__seat-btn"
        :class="{ 'is-active': currentSeat === null }"
        @click="$emit('set-seat', null)"
      >
        {{ $i('pos_seat_shared') }}
      </button>
      <button
        v-for="n in seatChipCount"
        :key="n"
        type="button"
        class="product-grid__seat-btn"
        :class="{ 'is-active': currentSeat === n }"
        @click="$emit('set-seat', n)"
      >
        {{ n }}
        <span v-if="seatCounts[n]" class="product-grid__seat-count">{{ seatCounts[n] }}</span>
      </button>
      <button
        type="button"
        class="product-grid__seat-add"
        :title="$i('pos_seat_add')"
        @click="$emit('add-seat')"
      >
        +
      </button>
      <button
        v-if="seatRemovable"
        type="button"
        class="product-grid__seat-remove"
        :title="$i('pos_seat_remove')"
        @click="$emit('remove-seat')"
      >
        −
      </button>
    </div>

    <!-- Category tabs. The row used to disappear entirely while searching, which cost the operator
         the sense of where they were; it now stays put, dimmed, and doubles as the way back —
         tapping a tab clears the search and lands on that category. -->
    <div class="product-grid__tabs" :class="{ 'is-searching': !!query }">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="product-grid__tab"
        :class="{ 'is-active': !query && activeCategoryId === cat.id }"
        @click="onTabClick(cat)"
      >
        {{ cat.name }}
      </button>
      <span v-if="query" class="product-grid__tabs-count">{{ $i('pos_search_results', { count: visibleProducts.length }) }}</span>
    </div>

    <!-- Quantity multiplier: arm a count, then tap the product once. Ringing six coffees was six
         taps (and six round trips); it is now two. Deliberately self-clearing after the next tile
         so an armed ×6 can never leak into the following item — and the banner makes the armed
         state impossible to miss while it lasts. -->
    <div class="product-grid__multiplier">
      <span class="product-grid__multiplier-label">{{ $i('pos_multiplier') }}</span>
      <button
        v-for="n in multiplierSteps"
        :key="n"
        type="button"
        class="product-grid__multiplier-btn"
        :class="{ 'is-active': multiplier === n }"
        @click="setMultiplier(n)"
      >
        ×{{ n }}
      </button>
      <span v-if="multiplier > 1" class="product-grid__multiplier-armed">
        {{ $i('pos_multiplier_armed', { count: multiplier }) }}
      </span>
    </div>

    <!-- Tiles -->
    <div class="product-grid__scroll">
      <div v-if="catalogError" class="product-grid__state">
        <p>{{ $i('pos_catalog_error') }}</p>
        <button type="button" class="product-grid__retry" @click="$emit('reload-catalog')">
          {{ $i('pos_retry') }}
        </button>
      </div>
      <p v-else-if="!visibleProducts.length" class="product-grid__empty">
        {{ $i('pos_no_products') }}
      </p>
      <div class="product-grid__tiles">
        <ProductTile
          v-for="p in visibleProducts"
          :key="p.id"
          :product="p"
          :sold-out="isSoldOut(p)"
          @select="onTileSelect(p)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import ProductTile from '~/components/admin/pos/ProductTile.vue';

// The product catalog grid: category tabs from the store's categories, tiles from each category's
// product list items. The search box doubles as an EAN field — Enter emits `scan` for a barcode
// lookup. Sold-out state comes from the polled board status plus per-product flags.
export default {
  name: 'ProductGrid',
  components: { ProductTile },
  props: {
    categories: { type: Array, default: () => [] },
    soldOutProductIds: { type: Array, default: () => [] },
    soldOutCategoryIds: { type: Array, default: () => [] },
    deliveryType: { type: String, default: 'TableDelivery' },
    currentCourse: { type: Number, default: null },
    coursingEnabled: { type: Boolean, default: false },
    // Active guest for new lines (null = Felles / shared). Seating mirrors coursing but is opt-in.
    currentSeat: { type: Number, default: null },
    seatingEnabled: { type: Boolean, default: false },
    // How many numbered guest chips to render (derived from couverts and seats already on the check).
    seatChipCount: { type: Number, default: 0 },
    // Map of guest number -> item count, so a chip can show a subtle badge of who already has orders.
    seatCounts: { type: Object, default: () => ({}) },
    // Whether the top guest chip is a removable extra (added past the party size and unused), so the
    // "−" button is offered — a guest number can never be stranded on the row with no way to clear it.
    seatRemovable: { type: Boolean, default: false },
    catalogError: { type: Boolean, default: false }
  },
  data () {
    return {
      query: '',
      activeCategoryId: null,
      // Armed quantity for the next tile tap; always falls back to 1 once it has been used.
      multiplier: 1,
      multiplierSteps: [2, 3, 5, 10]
    };
  },
  computed: {
    // Products of the active category (deduped, non-hidden), each tagged with its category id.
    categoryProducts () {
      const cat = this.categories.find(c => c.id === this.activeCategoryId) || this.categories[0];
      if (!cat) { return []; }
      return this.productsOf(cat);
    },
    allProducts () {
      const seen = {};
      const out = [];
      this.categories.forEach((cat) => {
        this.productsOf(cat).forEach((p) => {
          if (!seen[p.id]) { seen[p.id] = true; out.push(p); }
        });
      });
      return out;
    },
    visibleProducts () {
      const q = this.query.trim().toLowerCase();
      if (!q) { return this.categoryProducts; }
      return this.allProducts.filter(p => (p.name || '').toLowerCase().includes(q));
    },
    // Which categories each product belongs to. Search results come from every category, so the
    // sold-out test cannot go by the tab that happens to be selected.
    categoryIdsByProduct () {
      const map = {};
      this.categories.forEach((cat) => {
        this.productsOf(cat).forEach((p) => {
          (map[p.id] || (map[p.id] = [])).push(cat.id);
        });
      });
      return map;
    }
  },
  watch: {
    categories: {
      immediate: true,
      handler (cats) {
        if (!this.activeCategoryId && cats && cats.length) {
          this.activeCategoryId = cats[0].id;
        }
      }
    }
  },
  methods: {
    productsOf (cat) {
      const items = cat.categoryProductListItems || [];
      return items
        .filter(i => !i.isHeading && i.product && !i.product.hide)
        .map(i => i.product);
    },
    isSoldOut (p) {
      if (p.soldOut || this.soldOutProductIds.includes(p.id)) { return true; }
      // Browsing a category: that category decides, as it always has. Searching: the results come
      // from everywhere, so going by the selected tab would both disable unrelated hits and let a
      // product from a sold-out category through. It counts as sold out only when every category
      // it sits in is sold out — one available route to it is enough to sell it.
      if (!this.query.trim()) { return this.soldOutCategoryIds.includes(this.activeCategoryId); }
      const catIds = this.categoryIdsByProduct[p.id] || [];
      return catIds.length > 0 && catIds.every(id => this.soldOutCategoryIds.includes(id));
    },
    // Enter used to always mean "look this up as a barcode", so typing a product name and pressing
    // Enter produced a barcode-not-found error. A barcode is all digits (EAN-8/12/13/14 and the
    // scanner's own output always are), so only that goes to the scan lookup; anything else picks
    // the single remaining match — the fast path when the operator has typed enough to narrow it
    // to one product — and otherwise just leaves the filtered grid up to tap from.
    onEnter () {
      const value = this.query.trim();
      if (!value) { return; }
      if (/^\d{6,}$/.test(value)) {
        // A scan consumes the multiplier too: the banner promises the NEXT item goes in ×n, and
        // leaving it armed would silently apply it to whatever the operator taps afterwards.
        this.$emit('scan', value, this.consumeMultiplier());
        this.query = '';
        return;
      }
      const matches = this.visibleProducts;
      // Sold out is enforced on the tile by :disabled; Enter must respect the same rule, or the
      // one product the operator cannot tap is the one they can still ring in by typing its name.
      // It still has to answer, though: silently doing nothing reads as a broken keyboard, and the
      // operator presses Enter again and again with no idea why.
      if (matches.length === 1) {
        if (this.isSoldOut(matches[0])) {
          this.$emit('sold-out', matches[0]);
          return;
        }
        this.$emit('select', matches[0], this.consumeMultiplier());
        this.query = '';
        return;
      }
      // Nothing matched the name either: it was probably a code after all — a scanner that emits
      // letters, a short PLU, a code with a check character. Let the barcode lookup have it, so
      // the operator gets "ukjent strekkode" rather than a keypress that does nothing at all.
      if (!matches.length) {
        this.$emit('scan', value, this.consumeMultiplier());
        this.query = '';
      }
    },
    // Tapping the armed step again disarms it, so a mis-tap costs one tap to undo.
    setMultiplier (n) {
      this.multiplier = this.multiplier === n ? 1 : n;
    },
    // Puts a spent multiplier back: the tile tap consumed it, but the option picker it opened was
    // cancelled, so nothing was actually rung in.
    armMultiplier (n) {
      this.multiplier = Math.max(1, n || 1);
    },
    // Every path that rings something in takes the multiplier through here, so it is spent exactly
    // once and the banner never keeps promising a quantity that has already been used.
    consumeMultiplier () {
      const quantity = this.multiplier;
      this.multiplier = 1;
      return quantity;
    },
    onTileSelect (product) {
      this.$emit('select', product, this.consumeMultiplier());
    },
    // While searching, a tab is the way back out: clear the query and show that category.
    onTabClick (cat) {
      this.query = '';
      this.activeCategoryId = cat.id;
    },
    focusSearch () {
      if (this.$refs.search) { this.$refs.search.focus(); }
    }
  }
};
</script>

<style scoped>
.product-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--pos-surface, #f8f9fa);
}

.product-grid__head {
  display: flex;
  gap: 12px;
  padding: 14px 16px 10px;
  align-items: center;
}

.product-grid__search {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}
.product-grid__search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}
.product-grid__search-input {
  width: 100%;
  height: 46px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 38px 0 38px;
  font-size: 1rem;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
}
.product-grid__search-input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.product-grid__search-clear {
  position: absolute;
  right: 8px;
  border: none;
  background: none;
  font-size: 1.4rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
}

.product-grid__delivery {
  display: flex;
  background: #eef1f5;
  border-radius: 12px;
  padding: 4px;
  flex-shrink: 0;
}
.product-grid__delivery-btn {
  border: none;
  background: none;
  padding: 9px 16px;
  border-radius: 9px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  font-size: 0.9rem;
}
.product-grid__delivery-btn.is-active { background: #ffffff; color: var(--pos-ink, #292c34); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }

.product-grid__course {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px 10px;
  flex-shrink: 0;
}
.product-grid__course-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; margin-right: 4px; }
.product-grid__course-btn { border: 1px solid #e2e8f0; background: #fff; color: #64748b; min-width: 34px; height: 30px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 0 10px; }
.product-grid__course-btn.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #fff; }

.product-grid__seat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.product-grid__seat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; margin-right: 4px; }
.product-grid__seat-btn { position: relative; border: 1px solid #e2e8f0; background: #fff; color: #64748b; min-width: 34px; height: 30px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; padding: 0 10px; }
.product-grid__seat-btn.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #fff; }
/* Subtle badge of how many items a guest already has, so the waiter sees at a glance who is served. */
.product-grid__seat-count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background: #64748b;
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
.product-grid__seat-btn.is-active .product-grid__seat-count { background: var(--pos-primary-dark, #159f63); }
.product-grid__seat-add { border: 1px dashed #cbd5e0; background: #fff; color: #64748b; min-width: 34px; height: 30px; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; padding: 0 10px; }
.product-grid__seat-add:hover { border-color: var(--pos-primary, #1bb776); color: var(--pos-primary-dark, #159f63); }
.product-grid__seat-remove { border: 1px dashed #cbd5e0; background: #fff; color: #64748b; min-width: 34px; height: 30px; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; padding: 0 10px; }
.product-grid__seat-remove:hover { border-color: #ef4444; color: #ef4444; }

.product-grid__multiplier {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.product-grid__multiplier-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
}
.product-grid__multiplier-btn {
  min-width: 52px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
}
.product-grid__multiplier-btn:hover { border-color: #cbd5e0; }
.product-grid__multiplier-btn.is-active {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
  color: #fff;
}
/* An armed multiplier changes what the next tap does, so it says so in words — a highlighted
   chip alone is too easy to miss on a busy screen. */
.product-grid__multiplier-armed {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--pos-primary-dark, #159f63);
}

.product-grid__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 10px;
  overflow-x: auto;
  flex-shrink: 0;
}
/* Dimmed, not hidden: the row still tells the operator where they were before they searched. */
.product-grid__tabs.is-searching .product-grid__tab { opacity: 0.45; }
.product-grid__tabs.is-searching .product-grid__tab:hover { opacity: 1; }
.product-grid__tabs-count {
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
.product-grid__tab {
  border: none;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  cursor: pointer;
}
.product-grid__tab.is-active { background: var(--pos-primary, #1bb776); border-color: var(--pos-primary, #1bb776); color: #ffffff; }

.product-grid__scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 16px 16px; }
.product-grid__empty { text-align: center; color: #94a3b8; margin-top: 40px; }

.product-grid__state { text-align: center; color: #64748b; margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.product-grid__retry {
  border: none;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: 10px;
  cursor: pointer;
}

.product-grid__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

</style>
