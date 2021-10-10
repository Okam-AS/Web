<template>
  <div>
    <div
      v-for="(variant, i) in items"
      :key="i"
    >
      <div>
        <span>{{ variant.name }}</span>
        <span>{{ variant.required ? 'Påkrevd' : 'Valgfritt' }}</span>
      </div>
      <div>
        <div
          v-for="(option, j) in variant.options"
          :key="j"
        >
          {{ option.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
    }
  },
  computed: {
  },
  mounted () {
  },
  methods: {

  }
}
</script>
