<template>
  <div class="product-conf">
    <div
      v-for="(variant, i) in localLineItem.product.productVariants"
      :key="i"
      class="product-group"
    >
      <div class="product-group__header">
        <h3 class="product-group__heading">{{ variant.name }}</h3>
        <div class="product-group__status">{{ variant.required ? 'Påkrevd' : 'Valgfritt' }}</div>
      </div>
      <div>
        <div
          v-for="(option, j) in variant.options"
          :key="j"
          :class="{ 'product-option': true, 'is-selected' : selectedOptions.map(x => x.id).includes(option.id)}"
          role="checkbox"
          tabindex="0"
          :aria-selected="selectedOptions.map(x => x.id).includes(option.id)"
          @click="optionClick(option.id)"
          @keyup.enter="optionClick(option.id)"
        >
          <span class="product-option__radio"></span>
          <span class="product-option__text">{{ option.name }}</span>
        </div>
      </div>
    </div>
    <div class="product-conf-summary">
      <span class="product-conf-summary__text">{{ selectedOptionNames }}</span>
      <span class="product-conf-summary__price">
        {{ priceLabel(totalAmount) }}
      </span>
    </div>
    <div class="product-conf-controls">
      <Stepper
        :quantity="localLineItem.quantity"
        @add="addQuantity(1)"
        @subtract="addQuantity(-1)"
      />

      <button class="add-button" @click="saveAndClose">
        {{ saveBtnText }}
      </button>
    </div>
  </div>
</template>

<script>
import Stepper from '@/components/molecules/Stepper'

export default {
  components: { Stepper },
  props: {
    lineItem: {
      type: Object,
      default: () => { }
    }
  },
  data () {
    return {
      isLoading: false,
      errorMessage: '',
      localLineItem: {
        quantity: 1,
        product: {
          productVariants: []
        }
      }
    }
  },
  computed: {
    saveBtnText () {
      if (
        this.localLineItem.quantity === 0 ||
        (this.localLineItem.product.soldOut && this.localLineItem.id)
      ) { return 'Fjern fra handlevogn' }
      if (!this.localLineItem.id) { return 'Legg i handlevogn' }
      return 'Oppdater'
    },
    saveEnabled () {
      const loading = this.isLoading || this.$store.state.cartIsLoading
      const disable = this.localLineItem.product.soldOut && !this.lineItem.id
      return !loading && !disable
    },
    selectedOptionNames () {
      return this.selectedOptions.map(x => x.name).join(', ')
    },
    selectedOptionsAmount () {
      let optionsAmount = 0
      this.selectedOptions.forEach((option) => {
        optionsAmount += option.amount * (option.negativeAmount ? -1 : 1)
      })
      return optionsAmount
    },
    selectedOptions () {
      const selectedOptions = [];
      (this.localLineItem.product.productVariants || []).forEach((variant) => {
        variant.options
          .filter(y => y.selected)
          .forEach((option) => {
            selectedOptions.push(option)
          })
      })
      return selectedOptions
    },
    totalAmount () {
      const totalAmount =
        (this.localLineItem.product.baseAmount || 0) +
        this.selectedOptionsAmount -
        this.localLineItem.product.discountAmount
      return (
        (totalAmount <= 0 ? this.localLineItem.product.amount : totalAmount) *
        (this.localLineItem.quantity ? this.localLineItem.quantity : 1)
      )
    }
  },
  mounted () {
    this.localLineItem = JSON.parse(JSON.stringify(this.lineItem))
  },
  methods: {
    createGuid () {
      const _p8 = (s) => {
        const p = (Math.random().toString(16) + '000000000').substr(2, 8)
        return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
      }
      return _p8() + _p8(true) + _p8(true) + _p8()
    },
    optionClick (optionId) {
      (this.localLineItem.product.productVariants || []).forEach((variant) => {
        const optionIsInThisVariant = variant.options.find(
          x => x.id === optionId
        )
        if (optionIsInThisVariant) {
          variant.options.forEach((option) => {
            if (!variant.multiselect && option.id !== optionId) { option.selected = false }
            if (option.id === optionId) { option.selected = !option.selected }
          })
        }
      })
    },
    valid () {
      const errorMessage = ''
      if (
        this.localLineItem.quantity === 0 ||
        this.localLineItem.product.soldOut
      ) { return true }
      // (this.localLineItem.product.productVariants || []).some((variant) => {
      //   if (
      //     variant.options &&
      //     variant.required &&
      //     (variant.options.filter(option => option.selected) || []).length ===
      //       0
      //   ) {
      //     errorMessage =
      //       'Velg \'' + variant.name + '\' for å legge vare i handlevogn'
      //     return true // Breaks loop
      //   }
      // })
      if (errorMessage) {
        window.alert(errorMessage)
      }
      return !errorMessage
    },
    addQuantity (addQuantity) {
      const newQuantity = this.localLineItem.quantity + addQuantity
      if (
        newQuantity < 0 ||
        (this.localLineItem.product.soldOut && addQuantity > 0)
      ) { return }
      this.localLineItem.quantity = newQuantity
    },
    saveAndClose () {
      if (!this.saveEnabled || !this.valid()) { return }
      if (!this.localLineItem.id) {
        if (this.localLineItem.quantity === 0) {
          return
        }
        this.localLineItem.id = this.createGuid()
      }
      this.localLineItem.product.selectedOptionNames = this.selectedOptionNames
      this.localLineItem.product.selectedOptionsAmount = this.selectedOptionsAmount
      this.localLineItem.product.amount =
        this.localLineItem.product.baseAmount + this.selectedOptionsAmount
      if (this.localLineItem.product.soldOut) { this.localLineItem.quantity = 0 }

      if (this.localLineItem.quantity === 0) {
        this._cartService.RemoveLineItem({
          storeId: this.localLineItem.product.storeId,
          lineItem: this.localLineItem
        })
      } else {
        this._cartService.SetLineItem({
          storeId: this.localLineItem.product.storeId,
          lineItem: JSON.parse(JSON.stringify(this.localLineItem))
        })
      }

      this.$emit('close')
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.product-conf {
  &-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 rem(24);
  }

  .product-group {
    background-color: $color-profile;
    padding: rem(24);
    margin-bottom: rem(4);

    &__header {
      display: flex;
      justify-content: space-between;
    }

    &__heading {
      font-size: rem(16);
    }

    &__status {
      font-size: rem(12);
    }
  }

  &-summary {
    margin-top: rem(20);
    padding: 0 rem(24) rem(24);
    display: flex;
    justify-content: space-between;
    column-gap: rem(24);

    &__text {
      font-size: rem(14);
    }

    &__price {
      font-weight: bold;
      white-space: nowrap;
    }
  }

  .product-option {
    font-size: rem(14);
    padding: rem(8) 0;
    cursor: pointer;
    display: flex;
    align-items: flex-start;

    &__radio,
    &__checkbox {
      width: rem(24);
      height: rem(24);
      border: 1px solid $color-dark;
      display: block;
      background-color: #fff;
      margin-right: rem(8);
      position: relative;
      flex-shrink: 0;
    }

    &__radio {
      border-radius: 50%;
    }

    &__text {
      padding-top: rem(3);
    }

    &.is-selected {
      .product-option__radio,
      .product-option__checkbox {
        &:before {
          position: absolute;
          content: "";
          width: rem(14);
          height: rem(14);
          background-color: $color-dark;
          top: rem(4);
          left: rem(4);
        }
      }
      
      .product-option__radio {
        &:before {
          border-radius: 50%;
        }
      }
    }
  }

  .add-button {
    background: #148556;
    color: white;
    padding: rem(12) rem(24);
    border-radius: rem(20);
    border: none;
    font-size: rem(14);
    font-weight: 700;
    font-family: 'Montserrat', sans-serif;
  }
}
</style>