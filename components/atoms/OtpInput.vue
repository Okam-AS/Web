<template>
  <div class="otp-input">
    <div class="otp-input__wrapper">
      <input
        v-for="(value, index) in values"
        :key="`otp-${index}`"
        :ref="`i${index}`"
        :autofocus="index === 0"
        :type="'tel'"
        :pattern="'[0-9]'"
        :data-id="index"
        :value="value"
        maxlength="1"
        class="otp-input__input"
        @input="onValueChange"
        @focus="onFocus"
        @keydown="onKeyDown"
        @paste="onPaste"
      >
    </div>
    <Loading v-if="loading" />
  </div>
</template>

<script>
import Loading from '@/components/atoms/Loading.vue'

// NOTE: Rewritten from https://github.com/suweya/vue-verification-code-input/blob/master/src/components/CodeInput.vue
const KEY_CODE = {
  backspace: 8,
  left: 37,
  up: 38,
  right: 39,
  down: 40
}
export default {
  components: { Loading },
  props: {
    loading: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      iRefs: ['i0', 'i1', 'i2', 'i3', 'i4', 'i5'],
      values: ['', '', '', '', '', ''],
      activeIndex: 0
    }
  },
  methods: {
    getRef (key) {
      if (Array.isArray(this.$refs[key])) { return this.$refs[key][0] } else { return this.$refs[key] }
    },
    onPaste (event) {
      event.preventDefault()
      const pastedData = event.clipboardData
        .getData('text/plain')
        .slice(0, 6 - this.activeIndex)
        .split('')

      if (pastedData.length === 6) {
        this.values = pastedData
        this.triggerChange()
      }
    },
    onFocus (e) {
      e.target.select(e)
    },
    onValueChange (e) {
      const index = parseInt(e.target.dataset.id)
      e.target.value = e.target.value.replace(/[^\d]/gi, '')

      if (e.target.value === '' || !e.target.validity.valid) {
        return
      }

      let next
      const value = e.target.value
      let { values } = this
      values = Object.assign([], values)
      if (value.length > 1) {
        let nextIndex = value.length + index - 1
        if (nextIndex >= 6) {
          nextIndex = 6 - 1
        }
        next = this.iRefs[nextIndex]
        const split = value.split('')
        split.forEach((item, i) => {
          const cursor = index + i
          if (cursor < 6) {
            values[cursor] = item
          }
        })
        this.values = values
      } else {
        next = this.iRefs[index + 1]
        values[index] = value
        this.values = values
      }
      if (next) {
        const element = this.getRef(next)
        element.focus()
        element.select()
      }
      this.triggerChange(values)
    },
    onKeyDown (e) {
      const index = parseInt(e.target.dataset.id)
      const prevIndex = index - 1
      const nextIndex = index + 1
      const prev = this.iRefs[prevIndex]
      const next = this.iRefs[nextIndex]

      switch (e.keyCode) {
      case KEY_CODE.backspace: {
        e.preventDefault()
        const vals = [...this.values]
        if (this.values[index]) {
          vals[index] = ''
          this.values = vals
          this.triggerChange(vals)
        } else if (prev) {
          vals[prevIndex] = ''
          this.getRef(prev).focus()
          this.values = vals
          this.triggerChange(vals)
        }
        break
      }
      case KEY_CODE.left:
        e.preventDefault()
        if (prev) {
          this.getRef(prev).focus()
        }
        break
      case KEY_CODE.right:
        e.preventDefault()
        if (next) {
          this.getRef(next).focus()
        }
        break
      case KEY_CODE.up:
      case KEY_CODE.down:
        e.preventDefault()
        break
      }
    },
    triggerChange (values = this.values) {
      const val = values.join('')
      this.$emit('update', val)
      if (val.length >= 6) {
        this.$emit('complete', val)
      }
    }
  }
}
</script>

<style lang="scss">
@import "../../assets/sass/common.scss";

.otp-input {
  margin-bottom: rem(16);
  text-align: center;
  color: red;

  &__wrapper {
    position: relative;
    display: flex;
    justify-content: stretch;
    max-width: rem(250);
    margin: 0 auto;
  }

  &__input {
    width: rem(40);
    height: rem(40);
    max-width: rem(40);
    display: block;
    text-align: center;
    margin: 0 auto;
    border-radius: rem(2);
  }
}
</style>