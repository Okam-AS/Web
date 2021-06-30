<template>
  <details class="faq-list__item">
    <summary class="faq-list__question-wrapper">
      <div class="faq-list__question ga-how-much-does-it-cost">
        {{ q }}
        <svg
          class="icon"
          viewbox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill-rule="evenodd"
          clip-rule="evenodd"
        >
          <path
            d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z"
          />
        </svg>
      </div>
    </summary>
    <div class="faq-list__answer">
      {{ a }}
      <slot />
    </div>
  </details>
</template>

<script>
export default {
  props: {
    q: {
      type: String,
      default: ''
    },
    a: {
      type: String,
      default: ''
    }
  }
}
</script>
