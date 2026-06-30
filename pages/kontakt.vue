<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">
            {{ copy.heading }}
          </h1>
          <article
            id="post-11"
            class="post-11 page type-page status-publish hentry"
          >
            <p>{{ copy.intro }}</p>

            <div class="kontakt-demo">
              <p class="kontakt-demo__lead">{{ copy.bookDemoLead }}</p>
              <BookDemoButton />
            </div>

            <p>
              {{ copy.emailLeadBefore }}
              <a :href="`mailto:${copy.email}`">{{ copy.email }}</a> {{ copy.emailLeadAfter }}
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
                  >{{ copy.emailLabel }}</label><input
                    id="wpforms-33-field_1"
                    v-model="userEmail"
                    type="email"
                    class="wpforms-field-medium email-field"
                    name="wpforms[fields][1]"
                    maxlength="100"
                  >
                  <div class="wpforms-field-description">
                    {{ copy.emailDescription }}
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
                  >{{ copy.messageLabel }} <span class="wpforms-required-label">*</span></label><textarea
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
                  {{ copy.submit }}
                </button>
              </div>
            </div>
            <div v-else>
              <p>{{ copy.sentConfirmation }}</p>
            </div>
          </article>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from '~/components/organisms/PageHeader.vue'
import PageFooter from '~/components/organisms/PageFooter.vue'
import BookDemoButton from '~/components/molecules/BookDemoButton.vue'

export default {
  components: { PageHeader, PageFooter, BookDemoButton },
  data: () => ({
    userEmail: '',
    message: '',
    messageSent: false
  }),
  head () {
    return this.isCh
      ? {
          title: 'Kontakt - Okam',
          meta: [
            {
              hid: 'description',
              name: 'description',
              content:
                'Nehmen Sie Kontakt mit dem Okam-Team auf. Schreiben Sie uns eine E-Mail oder nutzen Sie das Kontaktformular - wir helfen Ihnen gerne weiter.'
            }
          ]
        }
      : {}
  },
  computed: {
    copy () {
      return this.isCh
        ? {
            heading: 'Nehmen Sie Kontakt mit uns auf!',
            intro:
              'Wir hören gerne von Ihnen, wenn Sie eine Frage haben oder wenn wir sonst etwas für Sie tun können.',
            bookDemoLead: 'Möchten Sie Okam in Aktion sehen? Wählen Sie einen passenden Zeitpunkt für eine Demo:',
            emailLeadBefore: 'Schreiben Sie uns eine E-Mail an',
            emailLeadAfter: 'oder verwenden Sie das Kontaktformular unten.',
            email: 'kontakt@okam.ch',
            emailLabel: 'E-Mail',
            emailDescription: 'Bitte geben Sie die E-Mail-Adresse an, an die Sie eine Antwort wünschen',
            messageLabel: 'Nachricht',
            submit: 'Senden',
            sentConfirmation: 'Die Nachricht wurde gesendet. Vielen Dank für Ihre Rückmeldung!'
          }
        : {
            heading: 'Ta kontakt med oss!',
            intro:
              'Vi vil gjerne høre fra deg hvis det er noe du lurer på, eller om det er noe annet vi kan gjøre for deg.',
            bookDemoLead: 'Vil du se Okam i praksis? Velg et tidspunkt som passer deg for en demo:',
            emailLeadBefore: 'Send oss en e-post på',
            emailLeadAfter: 'eller brukt kontaktskjema under.',
            email: 'kontakt@okam.no',
            emailLabel: 'E-post',
            emailDescription: 'Vennligst oppgi e-posten du ønsker svar til',
            messageLabel: 'Melding',
            submit: 'Send',
            sentConfirmation: 'Meldingen er sendt. Takk for tilbakemeldingen!'
          }
    },
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

.kontakt-demo {
  margin: 24px 0 32px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;

  &__lead {
    margin: 0 0 16px;
  }
}
</style>
