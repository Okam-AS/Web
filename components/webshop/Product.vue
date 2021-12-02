<template>
  <div class="product">
    <div class="product-header" @click="$emit('openProduct', product.id)">
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

    <div class="product-footer">
      <template v-if="product && product.id">
        <ProductConfigFromCart
          :store-id="product.storeId"
          :product-id="product.id"
        />
      </template>
      <template
        v-if="
          selectedLineItem &&
            selectedLineItem.product &&
            selectedLineItem.product.id === product.id
        "
      >
        <ProductConfig :line-item="selectedLineItem" />
      </template>
    </div>
  </div>
</template>

<script>
import ProductConfig from '../../components/webshop/ProductConfig.vue'
import ProductConfigFromCart from '../../components/webshop/ProductConfigFromCart.vue'

export default {
  components: { ProductConfig, ProductConfigFromCart },
  props: {
    product: {
      type: Object,
      required: true
    },
    selectedLineItem: {
      type: Object,
      default: () => {}
    }
  },
  data: () => ({
    expanded: false
  })
}
</script>

<style lang="scss" scoped>
.product {
  border-bottom: 1px solid #c3c3c3;
  padding-bottom: 20px;
  margin-bottom: 20px;

  &-header {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
  }

  &-image {
    min-width: 50px;
    max-width: 50px;
    margin-right: 20px;

    img {
      width: 100%;
      height: auto;
    }
  }

  &-info {
    flex-grow: 1;
  }

  &-config-from-cart {
    margin: 20px 0 0 0;
    background: #D5F6E5;
    border: 1px solid green;
    border-radius: 4px;
    margin-left: 60px;
    padding: 4px;

    &-summary {
      width: 100%;
    }
  }
}
</style>
