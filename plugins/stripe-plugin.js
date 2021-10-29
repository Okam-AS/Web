import Vue from 'vue'
import { StripePlugin } from '@vue-stripe/vue-stripe'

const options = {
  pk: 'pk_test_51H4qD7LNNQ2fMCqGKVqDxFBnljHO1QyXuLSQ8BTvltvx9jKXGSw78WuX01i9miBj9hzh5L8AS9aiIXF9qUDq5kKH005deCclVN', // process.env.STRIPE_PUBLISHABLE_KEY,
  // stripeAccount: process.env.STRIPE_ACCOUNT,
  // apiVersion: process.env.API_VERSION,
  locale: 'nb' // process.env.LOCALE
}

Vue.use(StripePlugin, options)