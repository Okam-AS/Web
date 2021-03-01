<template>
  <div>
    <button @click="$store.commit('increment')">
      Clicked {{ $store.state.counter }} times
    </button>
    <div style="margin-top: 20px; padding: 20px; border: 1px dashed #f00;">
      User:
      <pre>{{ $store.state.currentUser }}</pre>
      <input
        v-model="phone"
        type="text"
      />
      <button @click="login">Login</button>
    </div>
  </div>
</template>
<script>
import { UserService } from '@/core/services/user-service.ts'
import { SendVerificationToken /*, Login, NotificationRegistration */ } from "@/core/models/index.ts"
const _userService = new UserService()

export default {
  data: () => ({
    phone: ''
  }),
  methods: {
    async login () {
      console.log('Login attempt')
      console.log(_userService)
      console.log(this.phone)
      const success = await _userService.SendVerificationToken(
        new SendVerificationToken('47' + this.phone)
      )

      console.log(success)
    }
  }
}
</script>