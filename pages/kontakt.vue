<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">
            Ta kontakt med oss!
          </h1>
          <article
            id="post-11"
            class="post-11 page type-page status-publish hentry"
          >
            <p>Vi vil gjerne høre fra deg hvis det er noe du lurer på, eller om det er noe annet vi kan gjøre for deg.</p>

            <p>
              Send oss en e-post på
              <a href="mailto:kontakt@okam.no">kontakt@okam.no</a> eller brukt kontaktskjema under.
            </p>

            <div
              v-if="!messageSent"
              id="wpforms-33"
              class="wpforms-container wpforms-container-full"
            >
              <noscript class="wpforms-error-noscript">Please enable JavaScript in your browser to complete this form.</noscript>
              <div class="wpforms-field-container">
                <div
                  id="wpforms-33-field_1-container"
                  class="wpforms-field wpforms-field-email"
                  data-field-id="1"
                >
                  <label
                    class="wpforms-field-label"
                    for="wpforms-33-field_1"
                  >E-post</label><input
                    id="wpforms-33-field_1"
                    v-model="userEmail"
                    type="email"
                    class="wpforms-field-medium email-field"
                    name="wpforms[fields][1]"
                    maxlength="100"
                  >
                  <div class="wpforms-field-description">
                    Vennligst oppgi e-posten du ønsker svar til
                  </div>
                </div>
                <div
                  id="wpforms-33-field_2-container"
                  class="wpforms-field wpforms-field-textarea"
                  data-field-id="2"
                >
                  <label
                    class="wpforms-field-label"
                    for="wpforms-33-field_2"
                  >Melding <span class="wpforms-required-label">*</span></label><textarea
                    id="wpforms-33-field_2"
                    v-model="message"
                    class="wpforms-field-medium wpforms-field-required message-field"
                    name="wpforms[fields][2]"
                    maxlength="2000"
                  />
                </div>
              </div>
              <div class="wpforms-submit-container">
                <button
                  id="wpforms-submit-33"
                  type="button"
                  :class="{
                    'wpforms-submit': true,
                    'disabled-btn': !submitEnabled,
                  }"
                  @click="submitFeedback"
                >
                  Send
                </button>
              </div>
            </div>
            <div v-else>
              <p>Meldingen er sendt. Takk for tilbakemeldingen!</p>
            </div>
          </article>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from '@/components/organisms/PageHeader.vue'
import PageFooter from '@/components/organisms/PageFooter.vue'

export default {
  components: { PageHeader, PageFooter },
  data: () => ({
    userEmail: '',
    message: '',
    messageSent: false
  }),
  computed: {
    submitEnabled () {
      return !this.messageSent && this.message.length > 0
    }
  },
  methods: {
    async submitFeedback () {
      if (this.submitEnabled) {
        this.messageSent = true
        const data = {
          feedback: this.userEmail + ' ' + this.message,
          source: '/kontakt'
        }
        await fetch('https://okamapi.azurewebsites.net/stores/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
      }
    }
  }
}
</script>

<style lang="scss">
.email-field,
.message-field {
  padding: 10px;
}

.message-field {
  min-height: 200px;
}
</style>
