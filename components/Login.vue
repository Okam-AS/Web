<template>
  <div>
    <div style="margin-top: 20px; padding: 20px; border: 1px dashed #f00;">
      <div v-if="mounted">
        <div v-if="user && user.token">
          {{ $t('youAreLoggedIn') }}
          <button @click="wipeUser">
            {{ $t('logout') }}
          </button>
          <div v-if="activeStore">
            <button @click="activeStore = null">
              {{ $t('back') }}
            </button>
            <h1>{{ activeStore.name }}</h1>
          </div>
          <div v-else>
            <ul>
              <li
                v-for="(s, index) in stores"
                :key="index"
                @click="activateStore(s)"
              >
                {{ s.name }}
              </li>
            </ul>
          </div>
        </div>
        <div v-else>
          <template v-if="!smsSent">
            <p>{{ $t('enterPhoneNumberLabel') }}</p>
            <input
              v-model="phone"
              :placeholder="$t('enterPhoneNumberPlaceholder')"
              type="text"
              @keyup.enter="getCode"
            >
            <button @click="getCode">
              {{ $t('enterPhoneNumberSubmit') }}
            </button>
          </template>
          <template v-else-if="!codeSent">
            <p>{{ $t('enterPhoneCodeLabel') }}</p>
            <input
              v-model="code"
              :placeholder="$t('enterPhoneCodePlaceholder')"
              type="text"
              @keyup.enter="login"
            >
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
import { StoreService } from '@/core/services/store-service.ts'
import { ProductService } from '@/core/services/product-service.ts'
import { SendVerificationToken /* , Login, NotificationRegistration */ } from '@/core/models/index.ts'

export default {
  data: () => ({
    mounted: false,
    countryCode: '+47',
    phone: '',
    code: '',
    smsSent: false,
    codeSent: false,
    userService: null,
    storeServive: null,
    productServive: null,
    stores: [],
    activeStore: null
  }),
  computed: {
    user () {
      return this.$store.state.currentUser
    }
  },
  mounted () {
    const storedUser = localStorage.getItem('user') || false
    this.userService = new UserService(this.$store)
    this.storeServive = new StoreService()
    this.productService = new ProductService()
    if (storedUser) {
      const user = JSON.parse(storedUser)
      this.$store.dispatch('SetCurrentUser', user)
      this.getStores()
    }
    this.mounted = true
  },
  methods: {
    activateStore (s) {
      this.activeStore = { ...s }
      this.productService.Get(s.id).then((res) => {
        window.console.log(res)
      })
    },
    getCode () {
      this.userService.SendVerificationToken(
        new SendVerificationToken(this.countryCode + this.phone)
      ).finally(() => {
        this.smsSent = true
      })
    },
    login () {
      const params = { phoneNumber: this.countryCode + this.phone, token: this.code }
      this.userService.Login(params).then(() => {
        this.codeSent = true
      }).catch(() => {
        this.codeSent = false
      }).finally(() => {
        this.getStores()
      })
    },
    wipeUser () {
      this.$store.dispatch('SetCurrentUser', {})
      this.smsSent = false
      this.codeSent = false
    },
    getStores () {
      this.storeServive.getAll().then((res) => {
        this.stores = res
      })
    }
  }
}
</script>