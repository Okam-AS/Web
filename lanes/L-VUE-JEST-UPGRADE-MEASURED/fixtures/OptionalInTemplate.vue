<template>
  <div class="probe">{{ (thing || {}).name && thing?.name }}</div>
</template>
<script>
export default { data: () => ({ thing: { name: 'x' } }) }
</script>
