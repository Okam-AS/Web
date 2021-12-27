<template>
  <div style="margin: 1em">
    <div style="margin: 0.5em; display: inline-block; vertical-align: middle">
      <img :src="iconUrl" :alt="name + ' icon'" :width="size" :height="size">
    </div>
    <div style="margin: 0.5em; display: inline-block; vertical-align: middle">
      <p style="font-weight: bold; margin: 0; padding: 0">
        {{ name }}
      </p>
      <p style="margin: 0; padding: 0; font-size: 14px">
        {{ description }}
      </p>
    </div>
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
