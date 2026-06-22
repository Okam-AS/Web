<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Allgemeine Geschäftsbedingungen</h1>
            <article class="page type-page status-publish hentry">
              <div class="legal-content">
                <p class="placeholder-note">
                  <strong>Hinweis:</strong> Dieser Text ist ein Platzhalter und muss vor der Veröffentlichung durch eine Rechtsberatung geprüft und finalisiert werden.
                </p>

                <p><strong>Stand: 22. Juni 2026</strong></p>

                <h2>Geltungsbereich</h2>
                <p>Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") regeln die Nutzung der von der Okam AG <em>[Platzhalter]</em> bereitgestellten Plattform sowie der zugehörigen Apps und Dienstleistungen. Okam tritt als Vermittlerin zwischen Händlern ("Verkäufer") und Nutzerinnen und Nutzern ("Käufer") auf und ist nicht selbst Partei der zwischen Käufer und Verkäufer geschlossenen Kaufverträge. Mit der Nutzung der Plattform akzeptieren Sie diese AGB.</p>

                <h2>Vertragsabschluss</h2>
                <p>Die Darstellung der Produkte auf der Plattform stellt kein verbindliches Angebot dar, sondern eine Aufforderung zur Bestellung. Mit dem Aufgeben einer Bestellung geben Sie ein verbindliches Angebot zum Abschluss eines Kaufvertrags mit dem jeweiligen Verkäufer ab. Der Vertrag kommt zustande, sobald der Verkäufer die Bestellung annimmt oder ausführt. Okam vermittelt diesen Vertragsabschluss, wird aber selbst nicht Vertragspartei.</p>

                <h2>Preise und Zahlung</h2>
                <p>Alle Preise verstehen sich in Schweizer Franken (CHF) und inklusive der gesetzlichen Mehrwertsteuer, sofern nicht anders angegeben. Ein Beispielpreis wird in der Form CHF 1'234.50 dargestellt. Die Zahlung erfolgt über die in der App angebotenen Zahlungsmittel, insbesondere TWINT sowie gängige Debit- und Kreditkarten. Die Zahlungsabwicklung erfolgt über externe Zahlungsdienstleister. Okam stellt lediglich die Integration der Zahlungslösungen bereit und übernimmt keine Haftung für die Zahlungstransaktionen selbst.</p>

                <h2>Lieferung</h2>
                <p>Ob eine Lieferung angeboten wird, entscheidet der jeweilige Verkäufer. Erfolgt die Lieferung durch den Verkäufer, liegt die Verantwortung für die Lieferung vollumfänglich beim Verkäufer. Okam ermöglicht die Auswahl der Liefermethode, ist jedoch nicht Partei der Liefervereinbarung zwischen Käufer und Verkäufer. Liefergebiete, Lieferzeiten und allfällige Liefergebühren werden vom Verkäufer festgelegt.</p>

                <h2>Widerruf und Rückgabe</h2>
                <p>Rückgaben und Reklamationen sind direkt mit dem jeweiligen Verkäufer zu vereinbaren und werden von diesem abgewickelt. Die anwendbaren Rückgaberechte richten sich nach den Bedingungen des Verkäufers sowie dem anwendbaren Schweizer Recht. Okam kann bei der Vermittlung der Kontaktangaben des Verkäufers behilflich sein, ist jedoch nicht Partei eines Rückgabe- oder Reklamationsverfahrens.</p>

                <h2>Haftung</h2>
                <p>Soweit gesetzlich zulässig, haftet die Okam AG nicht für indirekte oder mittelbare Schäden, Folgeschäden oder entgangenen Gewinn, die aus der Nutzung oder Nichtnutzung der Plattform entstehen. Für die Verfügbarkeit, Richtigkeit und Qualität der von Verkäufern angebotenen Produkte und Dienstleistungen sind die Verkäufer verantwortlich. Eine allfällige Haftung der Okam AG für leichte Fahrlässigkeit ist ausgeschlossen.</p>

                <h2>Anwendbares Recht und Gerichtsstand</h2>
                <p>Auf diese AGB und die Nutzung der Plattform ist ausschliesslich Schweizer Recht anwendbar, unter Ausschluss der Bestimmungen des internationalen Privatrechts sowie des UN-Kaufrechts (CISG). Ausschliesslicher Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz der Okam AG in der Schweiz <em>[Platzhalter]</em>.</p>

                <h2>Kontakt</h2>
                <p>Bei Fragen zu diesen AGB erreichen Sie uns unter hallo@okam.ch <em>[Platzhalter]</em>.</p>
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
      title: 'Allgemeine Geschäftsbedingungen - Okam',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Allgemeine Geschäftsbedingungen (AGB) der Okam AG für die Nutzung der Plattform in der Schweiz.'
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
