<template>
  <focus-trap>
    <div>
      <transition name="modal">
        <div class="modal-mask">
          <div class="modal-wrapper">
            <div class="modal-container">
              <div class="modal-body">
                <button
                  class="modal-close-button"
                  @click="$emit('close')"
                >
                  x
                </button>
                <slot />
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

export default {
  components: {
    FocusTrap
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
  },
  beforeUnmount () {
    document.body.classList.remove('noscroll')
    window.removeEventListener('keydown', this.escapeListener)
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
    background-color: rgba(0, 0, 0, 0.5);
    display: table;
    transition: opacity 0.3s ease;
    @include z-index('modal-backgrop')
  }

  &-wrapper {
    display: table-cell;
    vertical-align: middle;
  }

  &-container {
    width: rem(400);
    margin: 0px auto;
    padding: rem(20) rem(30);
    background-color: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
    transition: all 0.3s ease;
    font-family: Helvetica, Arial, sans-serif;
  }

  &-body {
    margin: rem(10);
    @include z-index('modal-body');
  }
  &-buttons button {
    display: inline-block;
  }

  &-close-button {
    float: right;
  }
}
</style>