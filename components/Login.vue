<template>
  <div @click="$store.commit('increment')">
    {{ test }} {{ $store.state.counter }}
  </div>
</template>
<script>
import { UserService } from '@/core/services/user-service.ts'

export default {
  data: () => ({
    test: 'Hi!'
  }),
  created () {
    this.test = 'I am a counter, please click me'
  },
  mounted () {
    window.console.log('UserService', new UserService())
  }
}
</script>