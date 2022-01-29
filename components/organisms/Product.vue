<template>
  <div
    class="product"
    :tabindex="hideLineItems ? -1 : 0"
    @click="openProduct"
    @keyup.enter="openProduct"
  >
    <div class="product-header">
      <div class="product-image">
        <img
          v-if="product.image && product.image.thumbnailUrl"
          class="product-thumbnail"
          :src="product.image.thumbnailUrl"
        >
      </div>

      <div class="product-info">
        <div class="product-text">
          <h3 class="product-title">
            {{ product.name }}
          </h3>
          <span v-if="product.description" class="product-text">
            {{ product.description }}
          </span>
        </div>
        <div class="product-price">
          <span
            v-if="product.hasDiscount"
            style="text-decoration:line-through;"
          >{{
            priceLabel(product.discountAmount + product.amount)
          }}</span>
          <span v-if="product.soldOut" class="product-price__sold-out">
            Utsolgt
          </span>
          <span v-else>{{
            priceLabel(product.amount)
          }}</span>
        </div>
      </div>
    </div>

    <div v-if="!hideLineItems && product.storeId" class="product-footer">
      <ProductConfigFromCart
        :product-id="product.id"
        @openLineItem="openLineItem"
      />
    </div>
  </div>
</template>

<script>
import ProductConfigFromCart from '@/components/organisms/ProductConfigFromCart.vue'

export default {
  components: { ProductConfigFromCart },
  props: {
    product: {
      type: Object,
      required: true
    },
    hideLineItems: {
      type: Boolean,
      default: false
    },
    selectedLineItem: {
      type: Object,
      default: () => {}
    }
  },
  methods: {
    openProduct () {
      if (!this.hideLineItems && !this.product.soldOut) {
        this.$emit('openProduct', this.product.id)
      }
    },
    openLineItem (lineItem) {
      this.$emit('openLineItem', lineItem)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.product {
  margin-bottom: 0;
  padding: rem(24) rem(16);

  &-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  &-image {
    min-width: rem(50);
    max-width: rem(50);
    margin-right: rem(20);
    border-radius: rem(5);
    max-height: rem(50);
    background-color: #f6f6f6;
    flex-shrink: 0;

    img {
      width: 100%;
      height: auto;
      border-radius: rem(5);
    }
  }

  &-info {
    flex-grow: 1;
  }

  &-title {
    font-size: rem(18);
    line-height: 1.35;
  }

  &-text {
    line-height: 1.35;
  }

  &-price {
    margin-top: rem(8);

    &__sold-out {
      background-color: $color-neutral-light;
      padding: rem(4) rem(8);
      font-style: italic;
    }
  }

  &-config-from-cart {
    margin: rem(20) 0 0 0;
    background: #D5F6E5;
    border: 1px solid green;
    border-radius: 4px;
    margin-left: rem(60);
    padding: 4px;

    &-summary {
      width: 100%;
    }
  }
}
</style>
