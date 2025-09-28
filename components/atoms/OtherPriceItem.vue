<template>
  <div class="highlight-box__choice" @click="$emit('select', true)">
    <label class="checkbox checkbox--price">
      <input v-model="checkboxValue" type="checkbox">
      <span class="checkbox__text">{{ title }}</span>
      <span class="price">{{ formatedPrice }}</span>
      <span v-if="lineThroughtext" style="text-decoration: line-through">{{
        lineThroughtext
      }}</span>
    </label>
    <div class="highlight-box__choice-desc">
      {{ description }}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    price: {
      type: Number,
      default: 0
    },
    oldPrice: {
      type: Number,
      default: 0
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    checkboxValue: false
  }),
  computed: {
    formatedPrice () {
      if (!this.priceLabel || this.price <= 0) {
        return 'GRATIS'
      }
      return '+' + this.priceLabel(this.price)
    },
    lineThroughtext () {
      if (!this.priceLabel || this.oldPrice < 1) {
        return ''
      }
      return '(Ordinær pris kr ' + this.priceLabel(this.oldPrice) + ')'
    }
  },
  watch: {
    selected () {
      this.checkboxValue = this.selected
    }
  },
  mounted () {
    this.checkboxValue = this.selected
  }
}
</script>
