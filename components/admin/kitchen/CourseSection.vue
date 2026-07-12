<template>
  <div class="kds-course">
    <div
      v-if="showHeader"
      class="kds-course__header"
    >
      <span class="kds-course__title">{{ courseTitle }}</span>
      <span class="kds-course__spacer" />
      <button
        v-if="interactive && hasBumpable"
        class="kds-course__bump"
        @click="$emit('bump-course', courseSequence)"
      >
        <span class="material-icons">local_fire_department</span>
        {{ $i('kds_courseBump') }}
      </button>
    </div>

    <KitchenLine
      v-for="line in lines"
      :key="line.orderLineItemId"
      :line="line"
      :interactive="interactive"
      @bump="$emit('bump-line', $event)"
      @recall="$emit('recall-line', $event)"
    />
  </div>
</template>

<script>
import KitchenLine from '~/components/admin/kitchen/KitchenLine.vue'

export default {
  components: { KitchenLine },
  props: {
    // null means "no course assigned" (Uten rett).
    courseSequence: {
      type: Number,
      default: null
    },
    lines: {
      type: Array,
      default: () => []
    },
    interactive: {
      type: Boolean,
      default: false
    },
    showHeader: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    courseTitle () {
      if (this.courseSequence == null) {
        return this.$i('kds_courseNone')
      }
      return this.$i('kds_course', { n: this.courseSequence })
    },
    hasBumpable () {
      return this.lines.some(l => l.status === 'Sent' || l.status === 'Fired')
    }
  }
}
</script>
