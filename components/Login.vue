<template>
  <div>
    <!--
    <button @click="$store.commit('increment')">
      Clicked {{ $store.state.counter }} times
    </button>
    -->
    <div style="margin-top: 20px; padding: 20px; border: 1px dashed #f00;">
     <template v-if="!smsSent">
        <p>Skriv ditt telefonnummer for å få tilsendt sms-kode</p>
        <input
          v-model="phone"
          placeholder="Telefon"
          type="text"
        />
        <button @click="getCode">Send</button>
      </template>
      <template v-else-if="!codeSent">
        <p>Skriv inn kode fra SMS for å logge inn</p>
        <input
          v-model="code"
          placeholder="Kode fra SMS"
          type="text"
        />
        <button @click="login">Login</button>
      </template>
      <template v-else>
        Da er du logget inn<br />
        {{ response }}
      </template>
    </div>
  </div>
</template>
<script>
import { UserService } from '@/core/services/user-service.ts'
import { SendVerificationToken /* , Login, NotificationRegistration */ } from "@/core/models/index.ts"
const _userService = new UserService()

export default {
  data: () => ({
    phone: '',
    code: '',
    smsSent: false,
    codeSent: false,
    response: null
  }),
  methods: {
    getCode () {
      _userService.SendVerificationToken(
        new SendVerificationToken('+47' + this.phone)
      ).finally(() => {
        this.smsSent = true
      })
    },
    login () {
      const params = { phoneNumber: '+47' + this.phone, token: this.code }
      _userService.Login(params).then((res) => {
        this.response = res
      }).finally(() => {
        this.codeSent = true
      })
    }
  }
}
</script>