// Shared dismissal behaviour for the small popovers in the menu workspace.
//
// The rule these implement: a popover belongs to the thing that opened it, so it closes when the
// operator looks away — a click outside, Escape, or the page moving under it — and stays open
// while they are working inside it.
//
// Scrolling is the case that was wrong. Listening for scroll on the window in the capture phase
// hears every scroll on the page, including the one inside the popover's own list, so reaching
// for an option below the fold closed the thing being reached into. What matters is where the
// scroll happened: inside is the operator using it, outside is the page moving beneath it.

export default {
  mounted () {
    document.addEventListener('mousedown', this.onPointerDown)
    window.addEventListener('resize', this.onViewportChange)
    // Capture, because a scroll inside an arbitrary container does not bubble to the window.
    window.addEventListener('scroll', this.onDocumentScroll, true)
  },
  beforeDestroy () {
    document.removeEventListener('mousedown', this.onPointerDown)
    window.removeEventListener('resize', this.onViewportChange)
    window.removeEventListener('scroll', this.onDocumentScroll, true)
  },
  methods: {
    /** The element the popover renders into, which subclasses name through $refs. */
    popoverElement () {
      return this.$refs[this.popoverRef || 'panel'] || null
    },
    onPointerDown (event) {
      if (this.$el.contains(event.target)) { return }
      const panel = this.popoverElement()
      if (panel && panel.contains && panel.contains(event.target)) { return }
      this.close()
    },
    /**
     * A scroll inside the popover is the operator reading it. Anything else moved the page under
     * it, so it is re-anchored to its trigger, and closed only when that trigger has gone.
     */
    onDocumentScroll (event) {
      if (!this.open) { return }

      const panel = this.popoverElement()
      const target = event.target
      const inside = target && panel && (target === panel || (panel.contains && panel.contains(target)))
      if (inside) { return }

      this.onViewportChange()
    },
    onViewportChange () {
      if (!this.open) { return }
      if (!this.triggerIsVisible()) { this.close(); return }
      this.reposition()
    },
    /** True while the control that opened this is still somewhere on screen. */
    triggerIsVisible () {
      const trigger = this.$refs.trigger
      if (!trigger || typeof trigger.getBoundingClientRect !== 'function' || typeof window === 'undefined') {
        return true
      }

      const rect = trigger.getBoundingClientRect()
      if (!rect.width && !rect.height) { return true }
      return rect.bottom > 0 && rect.top < window.innerHeight
    }
  }
}
