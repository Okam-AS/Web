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
        class="input"
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
import Loading from '~/components/atoms/Loading.vue'

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
    },
    error: {
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
  watch: {
    error(newVal) {
      if (newVal) {
        // Clear all values and focus first input
        this.values = ['', '', '', '', '', '']
        this.$nextTick(() => {
          const firstInput = this.getRef('i0')
          if (firstInput) {
            firstInput.focus()
          }
        })
      }
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

<style lang="scss" scoped>
.otp-input {
  margin-bottom: 1rem;
  text-align: center;

  &__wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem 0;
  }

  .input {
    width: 52px;
    height: 56px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    caret-color: #1bb776;

    &:hover {
      border-color: #cbd5e0;
      background: #ffffff;
    }

    &:focus {
      outline: none;
      border-color: #1bb776;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(27, 183, 118, 0.1);
      transform: translateY(-2px);
    }

    // When input has a value
    &:not(:placeholder-shown) {
      border-color: #1bb776;
      background: #ffffff;
      color: #1bb776;
    }

    @media (max-width: 480px) {
      width: 44px;
      height: 48px;
      font-size: 1.25rem;
    }
  }
}
</style>