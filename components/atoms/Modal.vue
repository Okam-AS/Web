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

// ---- THE SCROLL LOCK, AND WHY IT IS DECLARED RATHER THAN ADDED --------------------------------
//
// `.noscroll` (assets/sass/_layout.scss) is what stops the page behind a modal from scrolling. It
// used to be put on the body with `document.body.classList.add('noscroll')` in `mounted`, and IT DID
// NOT WORK — not on one page, on every modal in the application.
//
// vue-meta owns `body.class`. `layouts/default.vue` declares `bodyAttrs`, and vue-meta's
// `updateAttribute` rebuilds that attribute from its OWN internal map and writes it whole with
// `setAttribute`. Anything else that touched the attribute is erased at the next head update — and
// the layout's `head()` reads `this.$route`, so a navigation is one. Measured in a browser on
// 2026-08-01 with the login modal open in the real `/admin/... -> /admin?redirect=...` flow: body
// `class=""`, computed `overflow: visible`. Adding `noscroll` by hand at that moment gave
// `overflow: hidden`; a single `$meta().refresh()` took it straight back off with the modal still
// open. The stylesheet was never the problem. The write was.
//
// So the class is DECLARED here, through the same mechanism that was deleting it. Two consequences
// are worth stating because both are the reason this shape was chosen:
//
//   • IT COMPOSES. The value is an ARRAY, and vue-meta merges array-valued attributes by
//     concatenation (`_arrayMerge` -> `destination.concat(source)`) rather than by replacement. The
//     layout contributes `okam-ch` on the Swiss market, a page may contribute its own, this modal
//     contributes `noscroll`, and none of them clobbers the others. A STRING here would replace the
//     layout's value and un-theme the whole Swiss site for as long as any modal was open. See the
//     comment in layouts/default.vue; the invariant is enforced by test/modal-scroll-lock.test.js.
//
//   • IT NEEDS NO REFERENCE COUNT. The classic failure of a counted body-class lock is two modals
//     open and one closing, which releases the lock behind the other. There is no counter to get
//     wrong here: vue-meta recomputes the attribute by walking the LIVE component tree on every
//     refresh, so the lock is held exactly while at least one Modal is mounted. The count IS the
//     tree. Destroying one instance re-derives the class from the one that is left.
//
// The class stays shared state, but it stops being MUTABLE shared state: it now has exactly one
// writer, and its value is derived rather than accumulated.
const BODY_SCROLL_LOCK_CLASS = 'noscroll'

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
    window.addEventListener('keydown', this.escapeListener)
    setTimeout(() => {
      this.active = true
    }, 100)
  },
  beforeDestroy () {
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
  },

  /**
   * The scroll lock. Declared, never added — see `BODY_SCROLL_LOCK_CLASS` above for what happened
   * the other way round, and why the value is an array.
   */
  head () {
    return {
      bodyAttrs: {
        class: [BODY_SCROLL_LOCK_CLASS]
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