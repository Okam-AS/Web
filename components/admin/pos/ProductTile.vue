<template>
  <button
    type="button"
    class="product-tile"
    :class="{ 'is-soldout': soldOut }"
    :disabled="soldOut"
    @click="$emit('select', product)"
  >
    <span class="product-tile__name">{{ product.name }}</span>
    <span class="product-tile__meta">
      <span class="product-tile__price">{{ priceLabel(product.amount, true) }}</span>
      <span v-if="hasOptions" class="product-tile__badge">{{ $i('pos_has_options') }}</span>
    </span>
    <span v-if="soldOut" class="product-tile__soldout">{{ $i('pos_sold_out') }}</span>
  </button>
</template>

<script>
// One product in the sales grid. Emits `select` with the product; the sell screen decides whether
// to add it directly or open the option picker.
export default {
  name: 'ProductTile',
  props: {
    product: { type: Object, required: true },
    soldOut: { type: Boolean, default: false }
  },
  computed: {
    hasOptions () {
      return this.product.productVariantEnabled &&
        Array.isArray(this.product.productVariants) &&
        this.product.productVariants.length > 0;
    }
  }
};
</script>

<style scoped>
.product-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  min-height: 92px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s ease, transform 0.05s ease, box-shadow 0.12s ease;
}
.product-tile:hover { border-color: var(--pos-primary, #1bb776); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06); }
.product-tile:active { transform: translateY(1px); }

.product-tile__name {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-tile__meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.product-tile__price { font-size: 0.95rem; font-weight: 700; color: var(--pos-primary-dark, #159f63); }
.product-tile__badge {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 6px;
}

.product-tile.is-soldout { opacity: 0.5; cursor: not-allowed; }
.product-tile__soldout {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
}
</style>
