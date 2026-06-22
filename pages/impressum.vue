<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Impressum</h1>
            <article class="page type-page status-publish hentry">
              <div class="legal-content">
                <p class="placeholder-note">
                  <strong>Hinweis:</strong> Dieser Text ist ein Platzhalter und muss vor der Veröffentlichung durch eine Rechtsberatung geprüft und finalisiert werden.
                </p>

                <p><strong>Stand: 22. Juni 2026</strong></p>

                <h2>Angaben gemäss UWG</h2>
                <p>Verantwortlich für den Inhalt dieser Website ist:</p>

                <h2>Firma</h2>
                <p>Okam AG <em>[Platzhalter]</em></p>

                <h2>Adresse</h2>
                <p>
                  Okam AG <em>[Platzhalter]</em><br>
                  Musterstrasse 1 <em>[Platzhalter]</em><br>
                  8000 Zürich <em>[Platzhalter]</em><br>
                  Schweiz
                </p>

                <h2>Kontakt</h2>
                <p>
                  E-Mail: hallo@okam.ch <em>[Platzhalter]</em><br>
                  Telefon: +41 00 000 00 00 <em>[Platzhalter]</em>
                </p>

                <h2>Handelsregister</h2>
                <p>
                  Eingetragen im Handelsregister des Kantons Zürich <em>[Platzhalter]</em><br>
                  Handelsregister-Nummer: CH-000.0.000.000-0 <em>[Platzhalter]</em>
                </p>

                <h2>UID-Nummer</h2>
                <p>
                  Unternehmens-Identifikationsnummer (UID): CHE-000.000.000 <em>[Platzhalter]</em><br>
                  Mehrwertsteuer-Nummer: CHE-000.000.000 MWST <em>[Platzhalter]</em>
                </p>

                <h2>Vertretungsberechtigte Person</h2>
                <p>Max Mustermann, Geschäftsführer <em>[Platzhalter]</em></p>

                <h2>Haftungsausschluss</h2>
                <p>Die Okam AG übernimmt keine Gewähr für die Aktualität, Richtigkeit und Vollständigkeit der auf dieser Website bereitgestellten Informationen. Haftungsansprüche gegen die Okam AG wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung beziehungsweise Nichtnutzung der veröffentlichten Informationen entstanden sind, werden ausgeschlossen.</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from '~/components/organisms/PageHeader.vue'
import PageFooter from '~/components/organisms/PageFooter.vue'

export default {
  components: { PageHeader, PageFooter },
  head () {
    return {
      title: 'Impressum - Okam',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Impressum der Okam AG mit Angaben gemäss UWG, Handelsregister und UID-Nummer.'
        }
      ]
    }
  }
}
</script>

<style scoped>
.legal-content h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.legal-content ul {
  list-style-type: disc;
  margin-left: 2rem;
}
.placeholder-note {
  padding: 12px 16px;
  margin-bottom: 1.5rem;
  background: #fff8e1;
  border: 1px solid #f0d98c;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.9em;
}
</style>
