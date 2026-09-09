<template>
  <div class="column-picker">
    <button
      ref="trigger"
      type="button"
      class="column-picker-trigger"
      :aria-expanded="String(open)"
      :aria-controls="open ? panelId : undefined"
      aria-haspopup="true"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span>{{ $i('menuImport_showColumns') }}</span>
      <span class="count">{{ optional.filter(column => isVisible(column.id)).length }}/{{ optional.length }}</span>
    </button>

    <div
      v-if="open"
      :id="panelId"
      ref="panel"
      class="column-picker-panel"
      role="dialog"
      :aria-label="$i('menuImport_showColumns')"
      @keydown.esc.stop.prevent="close"
    >
      <div class="column-picker-presets">
        <button type="button" @click="emitPreset('recommended')">
          {{ $i('menuImport_columnsRecommended') }}
        </button>
        <button type="button" @click="emitPreset('all')">
          {{ $i('menuImport_columnsAll') }}
        </button>
        <button type="button" @click="emitPreset('compact')">
          {{ $i('menuImport_columnsCompact') }}
        </button>
      </div>

      <ul class="column-picker-list" role="group">
        <li v-for="column in optional" :key="column.id">
          <label class="column-picker-option">
            <input
              type="checkbox"
              :checked="isVisible(column.id)"
              @change="emitToggle(column.id, $event.target.checked)"
            >
            <span>{{ $i(column.labelKey) }}</span>
            <!-- Says why a column is worth turning on, without turning it on. -->
            <small v-if="counts[column.id]">{{ $i('menuImport_columnHasData', { count: counts[column.id] }) }}</small>
          </label>
        </li>
      </ul>

      <p class="column-picker-note">
        {{ $i('menuImport_columnsNote') }}
      </p>
    </div>
  </div>
</template>

<script>
// The "show columns" control.
//
// It only ever reports what the operator asked to see. Hiding a column never drops data and
// never edits a product: the draft keeps every field either way, and a hidden column's value is
// still written if the operator had already edited it. That is why turning a column off is safe
// enough to be a single click with no warning.

import { COLUMNS } from '~/utils/menu-workspace'

export default {
  name: 'MenuColumnPicker',
  props: {
    visible: { type: Array, default: () => [] },
    // How many rows actually carry something for each optional column, so the menu can say which
    // ones are worth showing for this particular import.
    counts: { type: Object, default: () => ({}) }
  },
  data () {
    return { open: false }
  },
  computed: {
    panelId () { return 'menu-column-picker-' + this._uid },
    optional () { return COLUMNS.filter(column => !column.always) }
  },
  mounted () {
    document.addEventListener('mousedown', this.outside)
    window.addEventListener('resize', this.close)
  },
  beforeDestroy () {
    document.removeEventListener('mousedown', this.outside)
    window.removeEventListener('resize', this.close)
  },
  methods: {
    isVisible (id) { return this.visible.includes(id) },
    toggle () { this.open ? this.close() : this.show() },
    show () {
      this.open = true
      this.$nextTick(() => {
        const first = this.$refs.panel && this.$refs.panel.querySelector('button, input')
        if (first) { first.focus() }
      })
    },
    close () {
      if (!this.open) { return }
      this.open = false
      if (this.$refs.trigger) { this.$refs.trigger.focus() }
    },
    outside (event) {
      if (this.open && !this.$el.contains(event.target)) { this.open = false }
    },
    onTriggerKey (event) {
      if (['ArrowDown', 'Enter', ' '].includes(event.key) && !this.open) {
        event.preventDefault()
        this.show()
      }
    },
    emitToggle (id, checked) { this.$emit('toggle', { id, visible: checked }) },
    emitPreset (preset) {
      this.$emit('preset', preset)
      this.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.column-picker { position: relative; }

.column-picker-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 10px 14px;
  background: #fff; color: #292c34; border: 2px solid #e2e8f0; border-radius: 8px;
  font: inherit; font-weight: 500; cursor: pointer; transition: all 0.2s ease;

  &:hover { background: #f8f9fa; border-color: #cbd5e0; }
  &:focus-visible, &[aria-expanded="true"] { outline: 2px solid #1bb776; outline-offset: 2px; }

  .count { color: #64748b; font-size: 0.85em; font-variant-numeric: tabular-nums; }
}

.column-picker-panel {
  position: absolute; z-index: 60; top: calc(100% + 6px); right: 0;
  width: 280px; max-height: 420px; overflow-y: auto;
  padding: 12px; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.column-picker-presets {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0;

  button {
    flex: 1 1 auto; min-height: 36px; padding: 6px 10px;
    background: #f8f9fa; color: #292c34;
    border: 1px solid #e2e8f0; border-radius: 6px;
    font: inherit; font-size: 0.85em; font-weight: 600; cursor: pointer;

    &:hover { background: #f1f5f9; border-color: #cbd5e0; }
    &:focus-visible { outline: 2px solid #1bb776; outline-offset: 1px; }
  }
}

.column-picker-list { margin: 0; padding: 0; list-style: none; }

.column-picker-option {
  display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; align-items: center;
  min-height: 44px; padding: 6px 8px; border-radius: 8px; cursor: pointer;

  &:hover { background: #f8f9fa; }

  input { width: 18px; height: 18px; accent-color: #1bb776; margin: 0; }
  span { font-size: 0.92em; color: #292c34; }
  small { grid-column: 2; color: #64748b; font-size: 0.78em; }
  &:focus-within { outline: 2px solid #1bb776; outline-offset: 1px; }
}

.column-picker-note {
  margin: 10px 0 0; padding-top: 10px; border-top: 1px solid #e2e8f0;
  color: #64748b; font-size: 0.78em; font-style: italic;
}
</style>
