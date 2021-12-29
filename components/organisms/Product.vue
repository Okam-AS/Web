<template>
  <div class="product">
    <div class="product-header" @click="openProduct">
      <div class="product-image">
        <img
          v-if="product.image && product.image.thumbnailUrl"
          class="product-thumbnail"
          :src="product.image.thumbnailUrl"
        >
      </div>

      <div class="product-info">
        <div class="product-text">
          <h4>
            {{ product.name }}
          </h4>
          <span v-if="product.description">
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
          <span>{{
            product.soldOut ? "Utsolgt" : priceLabel(product.amount)
          }}</span>
        </div>
      </div>
    </div>

    <div v-if="!hideLineItems" class="product-footer">
      <ProductConfigFromCart
        v-if="product && product.id"
        :store-id="product.storeId"
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
      this.$emit('openProduct', this.product.id)
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
  border-bottom: 1px solid #c3c3c3;
  padding-bottom: rem(20);
  margin-bottom: rem(20);

  &-header {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
  }

  &-image {
    min-width: rem(50);
    max-width: rem(50);
    margin-right: rem(20);

    img {
      width: 100%;
      height: auto;
    }
  }

  &-info {
    flex-grow: 1;
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
