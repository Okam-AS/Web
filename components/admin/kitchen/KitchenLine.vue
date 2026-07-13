<template>
  <div
    class="kds-line"
    :class="{
      'is-bumpable': isBumpable,
      'is-ready': isReady,
      'is-fired': isFired
    }"
    @click="onRowClick"
  >
    <!-- Bump checkbox (POS lines): tap to mark ready -->
    <span
      v-if="interactive"
      class="kds-line__check"
    >
      <span class="material-icons">check</span>
    </span>

    <span class="kds-line__qty">{{ line.quantity }}×</span>

    <div class="kds-line__main">
      <div class="kds-line__name">
        <!-- Guest (seat) badge so a runner knows which cover the plate is for. Compact "G{n}". -->
        <span v-if="line.seatNumber != null" class="kds-line__seat">{{ seatBadge }}</span>{{ line.name }}
      </div>

      <div
        v-if="line.options && line.options.length"
        class="kds-line__options"
      >
        <span
          v-for="(option, i) in line.options"
          :key="i"
          class="kds-line__option"
        >
          <template v-if="option.parentName">{{ option.parentName }}: </template>{{ option.name }}
        </span>
      </div>

      <div
        v-if="line.notes"
        class="kds-line__notes"
      >
        <span class="material-icons">sticky_note_2</span>
        <span>{{ line.notes }}</span>
      </div>

      <div
        v-if="line.allergens && line.allergens.length"
        class="kds-line__allergens"
      >
        <span
          v-for="(allergen, i) in line.allergens"
          :key="i"
          class="kds-allergen"
        >
          <span class="material-icons">warning</span>
          {{ allergen }}
        </span>
      </div>
    </div>

    <!-- Recall (undo bump) for already-ready POS lines -->
    <button
      v-if="canRecall"
      class="kds-line__recall"
      :title="$i('kds_recall')"
      @click.stop="$emit('recall', line)"
    >
      <span class="material-icons">undo</span>
    </button>
  </div>
</template>

<script>
export default {
  props: {
    line: {
      type: Object,
      required: true
    },
    // POS lines are bumpable/recallable; online-order lines are read-only display.
    interactive: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // Compact guest marker, e.g. "G2". Locale-independent abbreviation shared with the POS check.
    seatBadge () {
      return 'G' + this.line.seatNumber
    },
    isReady () {
      return this.line.status === 'Ready' || this.line.status === 'Served'
    },
    isFired () {
      return this.line.status === 'Fired'
    },
    isBumpable () {
      return this.interactive && (this.line.status === 'Sent' || this.line.status === 'Fired')
    },
    canRecall () {
      return this.interactive && (this.line.status === 'Ready' || this.line.status === 'Served')
    }
  },
  methods: {
    onRowClick () {
      if (this.isBumpable) {
        this.$emit('bump', this.line)
      }
    }
  }
}
</script>
