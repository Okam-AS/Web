<template>
  <div style="margin: 1em">
    <img :src="iconUrl" :alt="name + ' icon'" :width="size" :height="size">
    <span style="margin-left: 1em">{{ name }}</span>
    <span>{{ description }}</span>
  </div>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    iconUrl: {
      type: String,
      default: 'click'
    },
    size: {
      type: Number,
      default: 40
    }
  }
}
</script>
