<template>
  <button
    type="button"
    class="product-tile"
    :class="{ 'is-soldout': soldOut, 'has-image': !!imageUrl }"
    :disabled="soldOut"
    @click="$emit('select', product)"
  >
    <span
      v-if="imageUrl"
      class="product-tile__bg"
      :style="{ backgroundImage: `url('${imageUrl}')` }"
      aria-hidden="true"
    />
    <span v-if="imageUrl" class="product-tile__scrim" aria-hidden="true" />
    <span class="product-tile__content">
      <span class="product-tile__name">{{ product.name }}</span>
      <span class="product-tile__meta">
        <span class="product-tile__price">{{ priceLabel(product.amount, true) }}</span>
        <span v-if="hasOptions" class="product-tile__badge">{{ $i('pos_has_options') }}</span>
      </span>
    </span>
    <span v-if="soldOut" class="product-tile__soldout">{{ $i('pos_sold_out') }}</span>
  </button>
</template>

<script>
// One product in the sales grid. Emits `select` with the product; the sell screen decides whether
// to add it directly or open the option picker. When the product has an image it is shown as the
// tile background behind a gradient scrim that keeps name and price readable.
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
    },
    imageUrl () {
      const image = this.product.image;
      if (!image) { return ''; }
      return image.thumbnailUrl || image.imageUrl || '';
    }
  }
};
</script>

<style scoped>
.product-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 92px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: border-color 0.12s ease, transform 0.05s ease, box-shadow 0.12s ease;
}
.product-tile:hover { border-color: var(--pos-primary, #1bb776); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06); }
.product-tile:active { transform: translateY(1px); }

.product-tile__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transition: transform 0.25s ease;
}
.product-tile:hover .product-tile__bg { transform: scale(1.05); }

/* Gradient scrim: heavy at the bottom where the text sits, transparent at the top. */
.product-tile__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(10, 14, 20, 0.82) 0%,
    rgba(10, 14, 20, 0.55) 38%,
    rgba(10, 14, 20, 0.12) 70%,
    rgba(10, 14, 20, 0) 100%
  );
}

.product-tile__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
}

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

/* Image tiles switch to light-on-dark text over the scrim. */
.product-tile.has-image { border-color: rgba(15, 23, 42, 0.12); }
.product-tile.has-image .product-tile__name {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}
.product-tile.has-image .product-tile__price {
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}
.product-tile.has-image .product-tile__badge {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.product-tile.is-soldout { opacity: 0.5; cursor: not-allowed; }
.product-tile.is-soldout .product-tile__bg { filter: grayscale(1); }
.product-tile__soldout {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #ef4444;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 6px;
}
</style>
