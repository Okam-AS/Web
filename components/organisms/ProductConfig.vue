<template>
  <div class="product-conf">
    <div
      v-for="(variant, i) in localLineItem.product.productVariants"
      :key="i"
    >
      <div>
        <span style="font-weight:bold">{{ variant.name }}</span>
        <span style="font-size: 0.5em;color:gray;">{{ variant.required ? 'Påkrevd' : 'Valgfritt' }}</span>
      </div>
      <div>
        <div
          v-for="(option, j) in variant.options"
          :key="j"
          :class="{ 'product-option': true, 'product-option-selected' : selectedOptions.map(x => x.id).includes(option.id)}"
          @click="optionClick(option.id)"
        >
          <img v-if="selectedOptions.map(x => x.id).includes(option.id)" src="~/assets/UI/icon_check.svg">
          {{ option.name }}
        </div>
      </div>
    </div>
    <div class="product-conf-summary">
      <span>{{ selectedOptionNames }}</span>
      <span class="product-conf-summary-price">
        {{ priceLabel(totalAmount) }}
      </span>
    </div>
    <div class="product-conf-controls">
      <span>Antall:</span>
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
  }

  &-summary {
    margin-top: rem(20);
    padding-top: rem(20);
    border-top: rem(1) solid $color-support;
    &-price {
      font-weight: bold;
    }
  }

  .product-option {
    font-size: 0.8em;
    cursor: pointer;
    margin-left: rem(28);

    img {
      width: rem(16);
      height: rem(16);
    }

    &-selected {
      margin-left: rem(8);
    }
  }

  .add-button {
    background: $color-support;
    color: white;
    padding: rem(10);
    border-radius: rem(20);
    border: none;
  }
}
</style>