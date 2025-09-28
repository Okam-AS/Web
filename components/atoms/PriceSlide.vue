<template>
  <div class="highlight-box">
    <h2 class="highlight-box__heading">
      {{ title }}
    </h2>
    <p v-if="description">
      {{ description }}
    </p>
    <slot />
    <div class="highlight-box__choices">
      <div class="highlight-box__choice">
        <label class="radio radio--price">
          <input
            v-model="localValue"
            type="radio"
            :name="radioName"
            value="yes"
          >
          <span class="radio__text">{{ yesLabel }}</span>
          <div class="price">
            <div v-if="oneTimePrice > 0">
              {{ oneTimePriceLabel }}
            </div>
            <div v-if="monthlyPrice > 0">
              {{ monthlyPriceLabel }}
            </div>
          </div>
        </label>
      </div>
      <div class="highlight-box__choice">
        <label class="radio">
          <input
            v-model="localValue"
            type="radio"
            :name="radioName"
            value="no"
          >
          <span>{{ noLabel }}</span>
        </label>
      </div>
    </div>
    <div class="btn-row btn-row--space-between">
      <button
        class="btn-link"
        type="button"
        :style="stepCount > 1 ? 'opacity: 1' : 'opacity: 0'"
        @click="stepCount > 1 ? $emit('back') : ''"
      >
        Tilbake
      </button>
      <button
        class="btn btn--primary"
        type="submit"
        :style="disableNext ? 'opacity: 0.3' : 'opacity: 1'"
        @click="disableNext ? '' : $emit('next')"
      >
        Neste
      </button>
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
    monthlyPrice: {
      type: Number,
      default: 0
    },
    oneTimePrice: {
      type: Number,
      default: 0
    },
    yesLabel: {
      type: String,
      default: 'Ja takk'
    },
    noLabel: {
      type: String,
      default: 'Nei takk'
    },
    selected: {
      type: Boolean,
      default: null
    },
    stepCount: {
      type: Number,
      required: true
    }
  },
  data: () => ({
    localValue: ''
  }),
  computed: {
    disableNext () {
      return this.selected === null
    },
    radioName () {
      return 'step-' + this.stepCount
    },
    oneTimePriceLabel () {
      return this.priceLabel ? '+ ' + this.priceLabel(this.oneTimePrice) : ''
    },
    monthlyPriceLabel () {
      return this.priceLabel
        ? '+ ' + this.priceLabel(this.monthlyPrice) + '/mnd'
        : ''
    }
  },
  watch: {
    localValue () {
      let valueToEmit = null
      if (this.localValue === 'yes') { valueToEmit = true }
      if (this.localValue === 'no') { valueToEmit = false }
      this.$emit('select', valueToEmit)
    },
    selected () {
      if (this.selected === null) { this.localValue = '' } else if (this.selected === true) { this.localValue = 'yes' } else if (this.selected === false) { this.localValue = 'no' }
    }
  }
}
</script>
