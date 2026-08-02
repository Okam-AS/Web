// THE ONE WAY ANYTHING IN THIS APP STOPS THE PAGE BEHIND IT FROM SCROLLING.
//
// ---- WHY THERE HAS TO BE EXACTLY ONE ----------------------------------------------------------
//
// Before this file there were two mechanisms and eleven writers. `components/atoms/Modal.vue`
// declared a body CLASS through vue-meta (see its comment, and layouts/default.vue). Ten other
// places set the INLINE STYLE `document.body.style.overflow` by hand, in `mounted`/`beforeDestroy`
// and in their own `closeModal()`, and NOT ONE OF THEM COUNTED. The two channels are independent, so
// they never fought — which is exactly why nobody noticed the second one was wrong:
//
//   OrderModal opens, sets `overflow: hidden`. From inside it a person opens CustomerInfoModal,
//   which sets `overflow: hidden` again. They close the customer card; its `closeModal()` sets
//   `overflow: ''`. OrderModal is still on screen, full height, and the page behind it now scrolls.
//
// `pages/admin/ongoing.vue` alone hosts six of these modals over one shared `currentOrder`, and
// `components/organisms/OrderModal.vue` nests a seventh inside itself. A release is unconditional in
// every one of them, so on those surfaces the last close always wins regardless of what is still
// open. `components/organisms/PageHeader.vue#closeMenu` does the same from the marketing site's nav.
//
// ---- WHY IT IS DECLARED, AND WHY THE CLASS RATHER THAN THE STYLE ------------------------------
//
// The inline style survives a vue-meta head update and the class did not, which is what made the
// class the broken one until `lane/modal-scrolllock` fixed it. That is an argument for fixing the
// class, not for keeping the style: an imperative writer has to be told when to let go, and eleven
// components each deciding that for themselves is the reference-counting bug above. A DECLARED class
// is derived instead of accumulated — vue-meta rebuilds `body.class` by walking the LIVE component
// tree on every refresh, so the lock is held exactly while at least one locking component is mounted.
// THE TREE IS THE REFERENCE COUNT. There is no counter to get wrong, and no release to forget.
//
// Two rules follow, and both are enforced by test/modal-scroll-lock-estate.test.js because breaking
// either is invisible — nothing throws, nothing logs, a class simply stops being there:
//
//   • THE VALUE IS AN ARRAY. vue-meta merges array-valued attributes by concatenation and
//     string-valued ones by REPLACEMENT. One string anywhere in the chain deletes every other
//     contribution beneath it — a modal declaring `class: 'noscroll'` would take `okam-ch` off the
//     Swiss site for as long as it was open, and PageHeader is on every marketing page there is.
//
//   • A COMPONENT USING THIS MIXIN MUST NOT DECLARE ITS OWN `head()`. vue-meta installs no merge
//     strategy for the key, so Vue's default applies and the component's own `head()` REPLACES the
//     mixin's outright. The lock would vanish silently.
//
// ---- USING IT ---------------------------------------------------------------------------------
//
// A modal that locks for its whole life needs only the mixin:
//
//     import bodyScrollLock from '~/utils/body-scroll-lock'
//     export default { mixins: [bodyScrollLock] }
//
// A component that locks only some of the time overrides `bodyScrollLocked`, which is a computed, so
// the lock follows the state reactively (vue-meta coerces `head()` to a computed `$metaInfo` and
// watches it):
//
//     computed: { bodyScrollLocked () { return this.isMenuOpen } }
//
// A component that needs a different rule about WHEN the lock applies overrides
// `bodyScrollLockClasses` — see `pages/admin/products.vue`, whose editor is a full-screen sheet on a
// phone and a side panel on a desktop, and which therefore contributes a media-scoped class rather
// than asking JavaScript for the viewport width at one arbitrary moment.

/** `.noscroll` — assets/sass/_layout.scss. Locks unconditionally. */
export const BODY_SCROLL_LOCK_CLASS = 'noscroll'

/** `.noscroll-mobile` — assets/sass/_layout.scss. Locks only under the 768px breakpoint. */
export const BODY_SCROLL_LOCK_CLASS_MOBILE = 'noscroll-mobile'

export default {
  computed: {
    /** Override to lock conditionally. Reactive: vue-meta watches the head it feeds. */
    bodyScrollLocked () {
      return true
    },

    /** Override to lock under a different rule. Must be an ARRAY — see above. */
    bodyScrollLockClasses () {
      return [BODY_SCROLL_LOCK_CLASS]
    }
  },

  head () {
    return {
      bodyAttrs: {
        class: this.bodyScrollLocked ? this.bodyScrollLockClasses : []
      }
    }
  }
}
