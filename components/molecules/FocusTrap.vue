<template>
  <div>
    <div v-if="hasLeadingGuards" :tabIndex="disabled ? -1 : 0" :style="hidden" />
    <div v-if="hasLeadingGuards" :tabIndex="disabled ? -1 : 1" :style="hidden" />

    <div v-bind="groupAttr" data-lock @focusout="onBlur">
      <slot />
    </div>

    <div v-if="hasTailingGuards" :tabIndex="disabled ? -1 : 0" :style="hidden" />
  </div>
</template>

<script>
import moveFocusInside, { focusInside, focusIsHidden, constants } from 'focus-lock'

function deferAction (action) {
  const setImmediate = window.setImmediate
  if (typeof setImmediate !== 'undefined') {
    setImmediate(action)
  } else {
    setTimeout(action, 1)
  }
}
let lastActiveTrap = 0
let lastActiveFocus = null
let focusWasOutsideWindow = false
const focusOnBody = () => (
  document && document.activeElement === document.body
)
const isFreeFocus = () => focusOnBody() || focusIsHidden()
const activateTrap = () => {
  let result = false
  if (lastActiveTrap) {
    const { observed, onActivation } = lastActiveTrap
    if (focusWasOutsideWindow || !isFreeFocus() || !lastActiveFocus) {
      if (observed && !focusInside(observed)) {
        onActivation()
        result = moveFocusInside(observed, lastActiveFocus)
      }
      focusWasOutsideWindow = false
      lastActiveFocus = document && document.activeElement
    }
  }
  return result
}
const reducePropsToState = (propsList) => {
  return propsList
    .filter(({ disabled }) => !disabled)
    .slice(-1)[0]
}
const handleStateChangeOnClient = (trap) => {
  if (lastActiveTrap !== trap) {
    lastActiveTrap = null
  }
  lastActiveTrap = trap
  if (trap) {
    activateTrap()
    deferAction(activateTrap)
  }
}
let instances = []
const emitChange = () => {
  handleStateChangeOnClient(reducePropsToState(instances))
}
const onTrap = (event) => {
  if (activateTrap() && event) {
    // prevent scroll jump
    event.stopPropagation()
    event.preventDefault()
  }
}
const onBlur = () => {
  deferAction(activateTrap)
}
const onWindowBlur = () => {
  focusWasOutsideWindow = true
}
const attachHandler = () => {
  document.addEventListener('focusin', onTrap, true)
  document.addEventListener('focusout', onBlur)
  window.addEventListener('blur', onWindowBlur)
}
const detachHandler = () => {
  document.removeEventListener('focusin', onTrap, true)
  document.removeEventListener('focusout', onBlur)
  window.removeEventListener('blur', onWindowBlur)
}

export default {
  props: {
    returnFocus: {
      type: Boolean
    },
    disabled: {
      type: Boolean
    },
    noFocusGuards: {
      type: [Boolean, String],
      default: false
    },
    group: {
      type: String
    }
  },
  data () {
    return {
      data: {},
      hidden: ''//    "width: 1px;height: 0px;padding: 0;overflow: hidden;position: fixed;top: 0;left: 0;"
    }
  },
  computed: {
    groupAttr () {
      return { [constants.FOCUS_GROUP]: this.group }
    },
    hasLeadingGuards () {
      return this.noFocusGuards !== true
    },
    hasTailingGuards () {
      return this.hasLeadingGuards && (this.noFocusGuards !== 'tail')
    }
  },
  watch: {
    disabled () {
      this.data.disabled = this.disabled
      emitChange()
    }
  },
  mounted () {
    this.data.vue = this
    this.data.observed = this.$el.querySelector('[data-lock]')
    this.data.disabled = this.disabled
    this.data.onActivation = () => {
      this.originalFocusedElement = this.originalFocusedElement || document.activeElement
    }
    if (!instances.length) {
      attachHandler()
    }
    instances.push(this.data)
    emitChange()
  },
  // `destroyed`, NOT `unmounted`. This was written as `unmounted ()` — a VUE 3 hook — and this
  // application is Vue 2.7.14, whose teardown hooks are `beforeDestroy` and `destroyed`. Vue does
  // not warn about an option key it does not recognise: it merges it onto `$options` with the
  // default strategy (leaving it a raw function rather than the array a real hook becomes) and never
  // calls it. So this entire body ran ZERO times in this application's life, and all three of the
  // things it does are things that never happened —
  //   • the document `focusin`/`focusout` and window `blur` listeners were attached by the first
  //     modal of the session and released by nothing;
  //   • every trap ever mounted stayed in `instances`, holding its destroyed component and its now
  //     detached `[data-lock]` subtree, so a closed modal could still be the trap `lastActiveTrap`
  //     names — which is a focus-correctness bug, not only a leak;
  //   • `returnFocus` never restored focus to whatever opened the trap.
  // `destroyed` is the faithful counterpart of Vue 3's `unmounted` (both run after detach), and the
  // ordering matters here: `detachHandler` has to precede the `returnFocus` restore below, or the
  // trap would fight the focus it is trying to give back.
  // Held by test/focus-trap-teardown.test.js, which also sweeps the estate for the same misnaming.
  // Note that `eslint-plugin-vue` is 6.2.2 and predates Vue 3, so no rule here knows the name
  // `unmounted` — the linter had nothing to say about the defect and cannot guard the regression.
  destroyed () {
    instances = instances.filter(({ vue }) => vue !== this)
    if (!instances.length) {
      detachHandler()
    }
    if (
      this.returnFocus &&
      this.originalFocusedElement &&
      this.originalFocusedElement.focus
    ) {
      this.originalFocusedElement.focus()
    }
    emitChange()
  },
  methods: {
    onBlur () {
      deferAction(emitChange)
    }
  }
}
</script>