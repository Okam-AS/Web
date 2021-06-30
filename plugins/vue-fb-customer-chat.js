import Vue from 'vue'
import VueFbCustomerChat from 'vue-fb-customer-chat'

Vue.use(VueFbCustomerChat, {
  page_id: 106381431516230, //  change 'null' to your Facebook Page ID,
  theme_color: '#1BB776', // theme color in HEX
  locale: 'no_NB' // default 'en_US'
})