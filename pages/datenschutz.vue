<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Datenschutzerklärung</h1>
            <article class="page type-page status-publish hentry">
              <div class="legal-content">
                <p class="placeholder-note">
                  <strong>Hinweis:</strong> Dieser Text ist ein Platzhalter und muss vor der Veröffentlichung durch eine Rechtsberatung geprüft und finalisiert werden.
                </p>

                <p><strong>Stand: 22. Juni 2026</strong></p>

                <p>Diese Datenschutzerklärung informiert Sie über die Bearbeitung Ihrer Personendaten durch die Okam AG im Sinne des revidierten Schweizer Datenschutzgesetzes (revDSG). Der Schutz Ihrer Personendaten ist uns ein wichtiges Anliegen.</p>

                <h2>Verantwortliche Stelle</h2>
                <p>
                  Verantwortlich für die Bearbeitung Ihrer Personendaten ist:
                </p>
                <p>
                  Okam AG <em>[Platzhalter]</em><br>
                  Musterstrasse 1, 8000 Zürich <em>[Platzhalter]</em><br>
                  E-Mail: datenschutz@okam.ch <em>[Platzhalter]</em>
                </p>

                <h2>Welche Daten wir bearbeiten</h2>
                <p>Wir bearbeiten nur jene Personendaten, die zur Erbringung unserer Dienstleistung erforderlich sind. Dazu gehören je nach Nutzung der Okam-App oder unserer Websites insbesondere:</p>
                <ul>
                  <li>Telefonnummer (dient als Benutzeridentität)</li>
                  <li>Bestellinformationen und Bestellhistorie</li>
                  <li>Vorname und Nachname (sofern angegeben)</li>
                  <li>E-Mail-Adresse (sofern angegeben)</li>
                  <li>Lieferadresse (sofern angegeben)</li>
                  <li>Zahlungsart (keine sensiblen Zahlungsdaten)</li>
                  <li>Technische Nutzungsdaten wie IP-Adresse, Gerät und Browsertyp</li>
                </ul>

                <h2>Zweck der Bearbeitung</h2>
                <p>Wir bearbeiten Ihre Personendaten zu folgenden Zwecken:</p>
                <ul>
                  <li>Bereitstellung und Abwicklung der bestellten Leistungen</li>
                  <li>Verwaltung Ihres Benutzerkontos und Ihrer Bestellhistorie</li>
                  <li>Kommunikation mit Ihnen sowie Kundensupport</li>
                  <li>Sicherstellung des sicheren und stabilen Betriebs der Plattform</li>
                  <li>Erfüllung gesetzlicher Pflichten</li>
                </ul>

                <h2>Weitergabe an Dritte</h2>
                <p>Wir verkaufen Ihre Personendaten nicht an Dritte. Wenn Sie eine Bestellung aufgeben, geben wir die zur Ausführung der Bestellung notwendigen Daten an den betreffenden Händler weiter, beispielsweise Telefonnummer, Bestellzeitpunkt, Warenliste, Kommentare sowie gegebenenfalls Liefer- und Kontaktangaben. Zur Zahlungsabwicklung arbeiten wir mit Zahlungsdienstleistern wie TWINT und Anbietern für Kartenzahlungen zusammen. Eine Weitergabe erfolgt im Übrigen nur, soweit dies gesetzlich vorgeschrieben oder zur Vertragserfüllung erforderlich ist.</p>

                <h2>Cookies und Analyse</h2>
                <p>Unsere Website kann Cookies und vergleichbare Technologien verwenden, um die Funktionalität bereitzustellen und die Nutzung auszuwerten. Soweit wir Analysewerkzeuge einsetzen, verwenden wir diese, um unser Angebot zu verbessern. Sie können die Speicherung von Cookies in den Einstellungen Ihres Browsers einschränken oder verhindern.</p>

                <h2>Rechte der betroffenen Personen</h2>
                <p>Im Rahmen des anwendbaren Datenschutzrechts stehen Ihnen insbesondere folgende Rechte zu:</p>
                <ul>
                  <li>Recht auf Auskunft über die bearbeiteten Personendaten</li>
                  <li>Recht auf Berichtigung unrichtiger Daten</li>
                  <li>Recht auf Löschung Ihrer Daten</li>
                  <li>Recht auf Einschränkung der Bearbeitung</li>
                  <li>Recht auf Datenherausgabe und Datenübertragung</li>
                  <li>Recht auf Widerspruch gegen bestimmte Bearbeitungen</li>
                </ul>
                <p>Viele dieser Angaben können Sie direkt in der App einsehen und verwalten. Zur Ausübung Ihrer weiteren Rechte können Sie uns jederzeit kontaktieren.</p>

                <h2>Kontakt</h2>
                <p>Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte erreichen Sie uns unter datenschutz@okam.ch <em>[Platzhalter]</em>.</p>
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
      title: 'Datenschutzerklärung - Okam',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Datenschutzerklärung der Okam AG gemäss dem revidierten Schweizer Datenschutzgesetz (revDSG).'
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
