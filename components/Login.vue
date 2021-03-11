<template>
  <div>
    <div style="margin-top: 20px; padding: 20px; border: 1px dashed #f00;">
      <div v-if="mounted">
        <div v-if="user && user.token">
          {{ $t('youAreLoggedIn')}} 
          <button @click="wipeUser">
            {{ $t('logout') }}
          </button>
        </div>
        <div v-else>
          <template v-if="!smsSent">
            <p>{{ $t('enterPhoneNumberLabel') }}</p>
            <input
              v-model="phone"
              @keyup.enter="getCode"
              :placeholder="$t('enterPhoneNumberPlaceholder')"
              type="text"
            />
            <button @click="getCode">
              {{ $t('enterPhoneNumberSubmit') }}
            </button>
          </template>
          <template v-else-if="!codeSent">
            <p>{{ $t('enterPhoneCodeLabel') }}</p>
            <input
              v-model="code"
              @keyup.enter="login"
              :placeholder="$t('enterPhoneCodePlaceholder')"
              type="text"
            />
            <button @click="login">
              {{ $t('enterPhoneCodeSubmit') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { UserService } from '@/core/services/user-service.ts'
import { SendVerificationToken /* , Login, NotificationRegistration */ } from "@/core/models/index.ts"

export default {
  data: () => ({
    mounted: false,
    phone: '',
    code: '',
    smsSent: false,
    codeSent: false,
    userService: null
  }),
  methods: {
    getCode () {
      this.userService.SendVerificationToken(
        new SendVerificationToken('+47' + this.phone)
      ).finally(() => {
        this.smsSent = true
      })
    },
    login () {
      const params = { phoneNumber: '+47' + this.phone, token: this.code }
      this.userService.Login(params).then(() => {
        this.codeSent = true
        
      }).catch(() => {
        this.codeSent = false
      })
    },
    wipeUser () {
      this.$store.dispatch('SetCurrentUser', {})
      this.smsSent = false
      this.codeSent = false
    }
  },
  computed: {
    user () {
      return this.$store.state.currentUser
    }
  },
  mounted () {
    const storedUser = localStorage.getItem('user') || false
    if (storedUser) {
      const user = JSON.parse(storedUser)
      this.$store.dispatch('SetCurrentUser', user)
    }
    this.userService = new UserService(this.$store)
    this.mounted = true
  }
}
</script>