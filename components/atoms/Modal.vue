<template>
  <focus-trap>
    <div>
      <transition
        name="modal"
        mode="out-in"
      >
        <div
          v-if="active"
          class="modal-mask"
        >
          <div class="modal-wrapper">
            <div class="modal-container">
              <div class="modal-body">
                <close-button
                  v-if="!hideCloseBtn"
                  class="modal-close-button"
                  @click="$emit('close')"
                >
                  {{ closeBtnText }}
                </close-button>
                <div><slot /></div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </focus-trap>
  </transition>
  </div>
</template>

<script>
import FocusTrap from '@/components/molecules/FocusTrap'
import CloseButton from '@/components/atoms/CloseButton'

export default {
  components: {
    CloseButton, FocusTrap
  },
  props: {
    hideCloseBtn: {
      type: Boolean,
      default: false
    },
    closeBtnText: {
      type: String,
      default: 'Avbryt'
    }
  },
  data: () => ({
    active: false
  }),
  emits: ['close'],
  mounted () {
    document.body.classList.add('noscroll')
    window.addEventListener('keydown', this.escapeListener)
    setTimeout(() => {
      this.active = true
    }, 100)
  },
  beforeDestroy () {
    document.body.classList.remove('noscroll')
    window.removeEventListener('keydown', this.escapeListener)
  },
  methods: {
    close () {
      this.active = false
      setTimeout(() => {
        this.$emit('close')
      }, 400)
    },
    escapeListener (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        this.close()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.modal {
  &-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fff;
    transition: transform 0.3s ease;
    @include z-index('modal-backgrop');
    overflow: auto;
  }

  &-wrapper {
    overflow: auto;
  }

  &-container {
    position: relative;
    max-width: rem(600);
    min-width: rem(280);
    margin: 0px auto;
    padding: rem(24) 0;
    background-color: #fff;
    transition: all 0.3s ease;
  }

  &-body {
    @include z-index('modal-body');
  }
  &-buttons button {
    display: inline-block;
  }

  &-close-button {
    position: absolute;
    top: rem(16);
    right: rem(16);
  }
}
</style>