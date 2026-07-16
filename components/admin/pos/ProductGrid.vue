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

    <!-- Category tabs -->
    <div v-if="!query" class="product-grid__tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="product-grid__tab"
        :class="{ 'is-active': activeCategoryId === cat.id }"
        @click="activeCategoryId = cat.id"
      >
        {{ cat.name }}
      </button>
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
          @select="$emit('select', p)"
        />
        <!-- Open price is a tile, always last, in every category and in search. -->
        <button
          v-if="!catalogError"
          type="button"
          class="product-grid__openprice-tile"
          @click="$emit('open-price')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{{ $i('pos_open_price') }}</span>
        </button>
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
      activeCategoryId: null
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
      return !!p.soldOut ||
        this.soldOutProductIds.includes(p.id) ||
        this.soldOutCategoryIds.includes(this.activeCategoryId);
    },
    onEnter () {
      const value = this.query.trim();
      if (!value) { return; }
      this.$emit('scan', value);
      this.query = '';
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

.product-grid__tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 10px;
  overflow-x: auto;
  flex-shrink: 0;
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

/* Open price as the last tile — same footprint as a product tile, dashed to read as an action. */
.product-grid__openprice-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 96px;
  border: 1px dashed #cbd5e0;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}
.product-grid__openprice-tile svg { width: 26px; height: 26px; color: #64748b; }
.product-grid__openprice-tile:hover { border-color: var(--pos-primary, #1bb776); }
</style>
