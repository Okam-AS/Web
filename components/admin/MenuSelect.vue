<template>
  <div class="menu-select">
    <button
      ref="trigger"
      v-bind="$attrs"
      type="button"
      class="menu-select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="$attrs['aria-label'] || label || undefined"
      :aria-expanded="String(open)"
      :aria-controls="open ? listId : undefined"
      :aria-activedescendant="open && active >= 0 ? listId + '-' + active : undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKey"
      @blur="onBlur"
    >
      <span>{{ selected ? selected.label : placeholder }}</span>
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
    </button>
    <ul
v-if="open"
:id="listId"
ref="list"
class="menu-select-list"
role="listbox"
:aria-label="$attrs['aria-label'] || label"
:style="position"
@mousedown.prevent>
      <li
        v-for="(option, index) in options"
        :id="listId + '-' + index"
        :key="index"
        role="option"
        :aria-selected="String(option.value === value)"
        :aria-disabled="option.disabled ? 'true' : undefined"
        :class="{ active: active === index, selected: option.value === value, disabled: option.disabled }"
        @mouseenter="active = index"
        @click.prevent.stop="choose(index)"
      >
        <span>{{ option.label }}</span><span v-if="option.value === value" aria-hidden="true">✓</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  inheritAttrs: false,
  props: {
    value: { type: [String, Number, Boolean], default: null },
    options: { type: Array, default: () => [] },
    disabled: Boolean,
    placeholder: { type: String, default: '—' }
  },
  data () {
    return { open: false, active: -1, position: {}, label: '', search: '', searchAt: 0 }
  },
  computed: {
    listId () { return 'menu-select-' + this._uid },
    selected () { return this.options.find(option => option.value === this.value) }
  },
  watch: {
    disabled (value) { if (value) { this.open = false } }
  },
  mounted () {
    document.addEventListener('mousedown', this.outside)
    window.addEventListener('resize', this.close)
    window.addEventListener('scroll', this.onScroll, true)
    const label = this.$el.closest('label')
    if (label) {
      this.label = Array.from(label.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent.trim()).join(' ')
    }
  },
  beforeDestroy () {
    document.removeEventListener('mousedown', this.outside)
    window.removeEventListener('resize', this.close)
    window.removeEventListener('scroll', this.onScroll, true)
  },
  methods: {
    close () { this.open = false },
    outside (event) { if (!this.$el.contains(event.target)) { this.close() } },
    onBlur () { this.close() },
    onScroll (event) {
      if (!this.$refs.list || !this.$refs.list.contains(event.target)) { this.close() }
    },
    toggle () { this.open ? this.close() : this.show() },
    show () {
      if (this.disabled) { return }
      const rect = this.$refs.trigger.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const upwards = below < 220 && above > below
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 24)
      this.position = {
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px',
        width: width + 'px',
        maxHeight: Math.max(80, Math.min(300, upwards ? above : below)) + 'px',
        ...(upwards ? { bottom: window.innerHeight - rect.top + 6 + 'px' } : { top: rect.bottom + 6 + 'px' })
      }
      this.active = this.options.findIndex(option => option.value === this.value && !option.disabled)
      if (this.active < 0) { this.active = this.options.findIndex(option => !option.disabled) }
      this.open = true
      this.reveal()
    },
    reveal () {
      this.$nextTick(() => {
        const list = this.$refs.list
        const item = list && list.children[this.active]
        if (!item) { return }
        if (item.offsetTop < list.scrollTop) { list.scrollTop = item.offsetTop }
        if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight
        }
      })
    },
    choose (index) {
      const option = this.options[index]
      if (this.disabled || !option || option.disabled) { return }
      this.$emit('input', option.value)
      this.$emit('change', option.value)
      this.close()
      this.$refs.trigger.focus()
    },
    onKey (event) {
      if (this.disabled) { return }
      if (event.key === 'Tab') { this.close(); return }
      if (event.key === 'Escape') {
        if (this.open) { event.stopPropagation(); event.preventDefault(); this.close() }
        return
      }
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault()
        this.open ? this.choose(this.active) : this.show()
        return
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        if (!this.open) { this.show(); return }
        const indices = this.options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0)
        const current = indices.indexOf(this.active)
        if (event.key === 'Home') { this.active = indices[0] } else if (event.key === 'End') { this.active = indices[indices.length - 1] } else {
          this.active = indices[Math.max(0, Math.min(indices.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))]
        }
        this.reveal()
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        if (!this.open) { this.show() }
        this.search = (Date.now() - this.searchAt < 700 ? this.search : '') + event.key.toLocaleLowerCase()
        this.searchAt = Date.now()
        const index = this.options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(this.search))
        if (index >= 0) { this.active = index; this.reveal() }
      }
    }
  }
}
</script>

<style scoped lang="scss">
.menu-select { min-width: 0; width: 100%; text-transform: none; letter-spacing: normal; }
.menu-select-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid #cbd5e1;
  border-radius: 10px; background: #fff; color: #292c34; font: inherit;
  font-weight: 500; text-align: left; cursor: pointer;
  span { min-width: 0; overflow-wrap: anywhere; }
  svg { flex-shrink: 0; fill: none; stroke: #64748b; stroke-width: 1.7; }
  &:hover:not(:disabled) { border-color: #159f63; background: #fbfefc; }
  &:focus-visible, &[aria-expanded="true"] { outline: 2px solid #1bb776; outline-offset: 2px; }
  &:disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
}
.menu-select-list {
  position: fixed; z-index: 10000; overflow-y: auto; overscroll-behavior: contain;
  margin: 0; padding: 6px; list-style: none; box-sizing: border-box;
  border: 1px solid #dbe5df; border-radius: 12px; background: #fff;
  box-shadow: 0 12px 36px rgba(25, 45, 35, 0.16); color: #292c34;
  font-size: 14px; font-weight: 500; text-transform: none; letter-spacing: normal;
  li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 10px 12px; border-radius: 7px; cursor: pointer; overflow-wrap: anywhere; }
  li.active { background: #f1f5f3; }
  li.selected { color: #116a44; background: #eaf7f0; }
  li.disabled { color: #94a3b8; cursor: not-allowed; }
}
</style>
