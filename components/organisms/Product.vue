<template>
  <div class="product" :tabindex="hideLineItems ? -1 : 0" @click="openProduct" @keyup.enter="openProduct">
    <img v-if="isLargeImage" :src="product.image.imageUrl" class="expanded-image" @click="expandedImage = false">
    <div class="product-header">
      <div v-if="!isLargeImage" class="product-image">
        <img v-if="product.image && product.image.thumbnailUrl" class="product-thumbnail"
          :src="product.image.thumbnailUrl" @click="expandedImage = true">
      </div>

      <div class="product-info">
        <div>
          <h3 class="product-title">
            {{ product.name }}
          </h3>
          <span v-if="product.description">
            {{ product.description }}
          </span>
          <div v-if="product.otherInformation && hideLineItems" class="product-text-small">
            <span> {{ product.otherInformation }}</span>
          </div>
        </div>
        <div class="product-price">
          <span v-if="product.hasDiscount" style="text-decoration: line-through">
            {{ priceLabel(product.discountAmount + product.amount) }}
          </span>
          <span v-if="product.soldOut" class="product-price__sold-out">
            Utsolgt
          </span>
          <span v-else>{{ priceLabel(product.amount) }}</span>
          <span v-if="
            !product.soldOut &&
            product.tableAdditionalAmount > 0 &&
            hideLineItems
          " class="product-price__sold-out">
            {{
              "+" +
              priceLabel(product.tableAdditionalAmount, true) +
              " for spis inne"
            }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    imageCanBeExpanded: {
      type: Boolean,
      default: false
    },
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
      default: () => { }
    }
  },
  data: () => ({
    expandedImage: false
  }),
  computed: {
    isLargeImage() {
      return this.imageCanBeExpanded && this.expandedImage
    }
  },
  watch: {
    selectedLineItem() {
      if (!this.selectedLineItem && !this.selectedLineItem.product) {
        this.expandedImage = false
      }
    }
  },
  methods: {
    openProduct() {
      if (!this.hideLineItems && !this.product.soldOut) {
        this.$emit('openProduct', this.product.id)
      }
    },
    openLineItem(lineItem) {
      this.$emit('openLineItem', lineItem)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.product {
  margin-bottom: 0;
  padding: rem(16) rem(16);

  .product-text-small {
    font-size: 12;
    color: gray;
  }

  .modal-container & {
    padding: rem(24) rem(16);
  }

  .expanded-image {
    width: 100%;
    height: auto;
    cursor: pointer;
    margin-bottom: rem(20);
    border-radius: rem(5);
  }

  &-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  &-image {
    min-width: rem(60);
    max-width: rem(60);
    margin-right: rem(15);
    border-radius: rem(5);
    max-height: rem(60);
    background-color: #f6f6f6;
    flex-shrink: 0;

    img {
      width: 100%;
      height: auto;
      border-radius: rem(5);
      cursor: pointer;
    }
  }

  &-info {
    flex-grow: 1;
  }

  &-title {
    font-size: rem(16);
    line-height: 1.35;
    margin-bottom: rem(4);

    .modal-container & {
      padding-right: rem(30);
    }
  }

  &-text {
    line-height: 1.35;
    font-size: rem(14);
  }

  &-price {
    margin-top: rem(10);
    font-size: rem(14);

    &__sold-out {
      background-color: $color-neutral-light;
      padding: rem(4) rem(8);
      font-style: italic;
      font-size: 11px;
      border-radius: rem(4);
    }
  }

  &-config-from-cart {
    margin: rem(20) 0 0 0;
    background: #f2f4fb;
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
