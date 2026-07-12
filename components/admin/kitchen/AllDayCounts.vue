<template>
  <div class="kds-allday">
    <span class="kds-allday__label">
      <span class="material-icons">summarize</span>{{ $i('kds_allDayTitle') }}
    </span>
    <div
      v-if="counts.length"
      class="kds-allday__list"
    >
      <span
        v-for="item in counts"
        :key="item.name"
        class="kds-allday__chip"
      >
        <span class="kds-allday__qty">{{ item.quantity }}×</span>
        <span class="kds-allday__name">{{ item.name }}</span>
      </span>
    </div>
    <span
      v-else
      class="kds-allday__empty"
    >{{ $i('kds_allDayEmpty') }}</span>
  </div>
</template>

<script>
export default {
  props: {
    // Aggregated across all active kitchen lines: [{ name, quantity }], highest first.
    counts: {
      type: Array,
      default: () => []
    }
  }
}
</script>
