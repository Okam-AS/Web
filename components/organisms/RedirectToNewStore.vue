<template>
  <client-only placeholder="Vennligst vent...">
    <Loading />
  </client-only>
</template>

<script lang="ts">
import Loading from '@/components/atoms/Loading.vue'

export default {
  components: { Loading },
  props: {
    path: {
      type: String,
      default: ''
    }
  },
  mounted () {
    const newKeys = {
      store: 'id'
    }
    const oldUrlObject = new URL(window.location.href)
    const oldSearchParams = oldUrlObject.searchParams
    const newSearchParams = new URLSearchParams()
    const oldKeys = Array.from(oldSearchParams.keys())
    for (let i = 0; i < oldKeys.length; i++) {
      const oldKey = oldKeys[i]
      const newValue = oldSearchParams.get(oldKey)
      if (newKeys[oldKey]) {
        newSearchParams.set(newKeys[oldKey], newValue)
      } else {
        newSearchParams.set(oldKey, newValue)
      }
    }
    const newUrlObject = new URL('https://shop.okam.no' + this.path)
    newUrlObject.search = newSearchParams.toString()
    window.location.href = newUrlObject.toString()
  }
}
</script>
