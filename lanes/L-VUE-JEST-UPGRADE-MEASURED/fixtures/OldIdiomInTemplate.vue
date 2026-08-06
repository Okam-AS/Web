<template>
  <div class="probe">{{ (thing || {}).name }}</div>
</template>
<script>
export default { data: () => ({ thing: { name: 'x' } }) }
</script>
