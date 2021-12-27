<template>
  <div>
    <div style="margin: 0.5em; display: inline-block; vertical-align: middle">
      <img
        src="~/assets/UI/icon_check.svg"
        alt="check icon"
        width="16"
        height="16"
      >
    </div>
    <div style="margin: 0.5em; display: inline-block; vertical-align: middle">
      <p style="margin: 0; padding: 0">
        {{ text }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    text: {
      type: String,
      default: ''
    }
  }
}
</script>
