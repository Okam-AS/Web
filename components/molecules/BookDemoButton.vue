<template>
  <button
    type="button"
    class="book-demo-btn"
    :class="[`book-demo-btn--${variant}`, { 'book-demo-btn--block': block }]"
    :data-cal-link="calLink"
    :data-cal-namespace="namespace"
    :data-cal-config="calConfig"
  >
    <span class="material-icons">event_available</span>
    <span>{{ label || defaultLabel }}</span>
  </button>
</template>

<script>
// ─────────────────────────────────────────────────────────────
// Cal.com demo-booking knapp (åpner Cal.com sin popup-modal ved klikk)
//
// 👉 OPPSETT: Cal.com-lenke. Kan være bare brukernavnet (viser alle
//    event-typer i popupen) eller "<brukernavn>/<event-slug>" for å gå
//    rett til én bestemt demo-type, f.eks. 'okam-app-izhzxj/30min'.
//    Lenken kan også overstyres per knapp via :cal-link-propen.
// ─────────────────────────────────────────────────────────────
const DEFAULT_CAL_LINK = 'okam-app/30min'
const CAL_NAMESPACE = 'okam-demo'
const CAL_EMBED_SRC = 'https://app.cal.com/embed/embed.js'

export default {
  name: 'BookDemoButton',
  props: {
    // Overstyr Cal.com-lenken om nødvendig
    calLink: { type: String, default: DEFAULT_CAL_LINK },
    // Egendefinert knappetekst (faller tilbake til lokalisert standard)
    label: { type: String, default: '' },
    // Utseende: 'green' (brand) eller 'orange' (CTA)
    variant: { type: String, default: 'green' },
    // Full bredde
    block: { type: Boolean, default: false }
  },
  data: () => ({
    namespace: CAL_NAMESPACE
  }),
  computed: {
    defaultLabel () {
      return this.isCh ? 'Demo buchen' : 'Book demo'
    },
    calConfig () {
      // month_view = full kalendervisning i popupen
      return JSON.stringify({ layout: 'month_view' })
    }
  },
  mounted () {
    this.initCalEmbed()
  },
  methods: {
    initCalEmbed () {
      if (typeof window === 'undefined') { return }

      /* eslint-disable */
      // Offisiell Cal.com-loader. Setter opp en kø slik at et klikk fungerer
      // selv før embed.js er ferdig lastet, og er trygg å kjøre flere ganger.
      ;(function (C, A, L) { let p = function (a, ar) { a.q.push(ar) }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true } if (ar[0] === L) { const api = function () { p(api, arguments) }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]) } else p(cal, ar); return } p(cal, ar) } })(window, CAL_EMBED_SRC, 'init')
      /* eslint-enable */

      // Namespace + UI initialiseres bare én gang per side, selv med flere knapper.
      if (window.__okamCalInitialized) { return }
      window.__okamCalInitialized = true

      window.Cal('init', this.namespace, { origin: 'https://cal.com' })
      window.Cal.ns[this.namespace]('ui', {
        hideEventTypeDetails: false,
        layout: 'month_view',
        cssVarsPerTheme: { light: { 'cal-brand': '#1bb776' } }
      })
    }
  }
}
</script>

<style scoped>
.book-demo-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  font-size: 1.05rem;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
}

.book-demo-btn .material-icons {
  font-size: 1.3rem;
}

.book-demo-btn--green {
  background: #1bb776;
  color: #fff;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
}

.book-demo-btn--green:hover {
  background: #159f63;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
}

.book-demo-btn--orange {
  background: #ff6b35;
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
}

.book-demo-btn--orange:hover {
  background: #e55a2b;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 107, 53, 0.3);
}

.book-demo-btn--block {
  width: 100%;
  justify-content: center;
}
</style>
