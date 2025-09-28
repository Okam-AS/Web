<template>
  <focus-trap>
    <div>
      <transition
        name="modal"
        mode="out-in"
      >
        <div class="modal">
          <close-button
            v-if="!hideCloseBtn"
            class="close-button"
            @click="$emit('close')"
          >
            {{ closeBtnText }}
          </close-button>
          <div
            v-if="active"
            class="modal-mask"
          />
          <div class="modal-wrapper">
            <div :class="['modal-container', { 'modal-container--wide': wide }]">
              <div><slot /></div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </focus-trap>
</template>

<script>
import FocusTrap from '~/components/molecules/FocusTrap'
import CloseButton from '~/components/atoms/CloseButton'

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
    },
    wide: {
      type: Boolean,
      default: false
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
    background-color: rgba(0 0 0 / 50%);
    @include z-index('modal-backdrop');
  }

  .close-button {
    position: fixed;
    top: rem(10);
    right: rem(8);
    @include z-index('modal-close');
  }

  &-wrapper {
    overflow: auto;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    @include z-index('modal-body');
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &-container {
    position: relative;
    max-width: rem(600);
    min-width: rem(280);
    margin: 0px auto;
    padding: rem(20);
    max-height: 90vh;
    overflow-y: auto;
  }

  &-container--wide {
    max-width: 1200px;
    width: 90%;
    padding: 0;
  }

  &-buttons button {
    display: inline-block;
  }

  &-body {
    padding: rem(24);
  }
}
</style>