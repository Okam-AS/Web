<template>
  <div>{{ test }}</div>
</template>
<script>
import { UserService } from '@/core/services'

export default {
  data: () => ({
    test: 'tesst'
  }),
  created () {
    this.test = 'foo'
  },
  mounted () {
    window.console.table(UserService)
  }
}
</script>