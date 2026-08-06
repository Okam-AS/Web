<template>
  <div class="probe">{{ label }}</div>
</template>
<script>
export default {
  data: () => ({ thing: { name: 'x' } }),
  computed: { label () { return this.thing?.name || '-' } }
}
</script>
