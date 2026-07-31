<template>
  <div class="eg-shell">
    <div class="eg-shell__paper">
      <header class="eg-shell__top">
        <p class="eg-shell__eyebrow">
          {{ eyebrow }}
        </p>
        <!-- The guest's own language, on the page, because the link they were sent carries whatever
             prefix the venue happened to copy. Three buttons, no dropdown: a select on a page this
             short costs a tap and hides two of the three answers. -->
        <nav class="eg-shell__langs" :aria-label="t('ev_guest_lang_label')">
          <button
            v-for="option in locales"
            :key="option"
            type="button"
            class="eg-shell__lang"
            :class="{ 'eg-shell__lang--on': option === locale }"
            :aria-pressed="String(option === locale)"
            @click="$emit('locale', option)"
          >
            {{ t('ev_guest_lang_' + option) }}
          </button>
        </nav>
      </header>

      <main class="eg-shell__body">
        <slot />
      </main>

      <footer class="eg-shell__foot">
        <!-- Both lines belong to a page the guest reached from a message the venue sent them: one
             says not to forward the credential in the address bar, the other says where to reply.
             Neither is true of the open enquiry form, which a guest reaches from the venue's own
             website with no message behind it, so both are gated on the same fact. -->
        <template v-if="privateLink">
          <p class="eg-shell__note">
            {{ t('ev_guest_link_private') }}
          </p>
          <p class="eg-shell__note">
            {{ t('ev_guest_footer_help') }}
          </p>
        </template>
        <p class="eg-shell__mark">
          {{ t('ev_guest_footer_mark') }}
        </p>
      </footer>
    </div>
  </div>
</template>

<script>
import { translate } from '~/utils/i18n';
import { GUEST_LOCALES } from '~/utils/events/guest';

// The frame every guest page sits in: one paper card, the language switch, and the two footer
// sentences a tokenised link owes its reader.
//
// It translates through `translate(this.locale, …)` and NOT through the `$i` mixin, because `$i`
// resolves the operator's stored `adminLocale`. A guest has no operator, and reading one venue's
// staff preference out of localStorage would decide a stranger's language for them.
//
// It deliberately carries NO venue name, logo or address. `EventsPublicProposalView` and
// `EventsDepositPageView` carry no store identity at all, so there is nothing true to put there, and
// a brand block filled with this platform's own name would tell the guest the offer came from us.
export default {
  name: 'GuestShell',
  props: {
    locale: {
      type: String,
      default: 'no'
    },
    // The one mono-caps eyebrow the page is allowed, rendered at page level.
    eyebrow: {
      type: String,
      default: ''
    },
    // Adds the "do not forward this" line. True for the tokenised pages, false for the open form.
    privateLink: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    locales () {
      return GUEST_LOCALES;
    }
  },
  methods: {
    t (key, params) {
      return translate(this.locale, key, params);
    }
  }
};
</script>

<style scoped>
.eg-shell {
  min-height: 100vh;
  background: #f4f6f8;
  padding: 32px 20px 56px;
  display: flex;
  justify-content: center;
  color: #292c34;
  font-size: 16px;
  line-height: 1.45;
}

.eg-shell__paper {
  width: 100%;
  max-width: 660px;
}

.eg-shell__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.eg-shell__eyebrow {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.eg-shell__langs {
  display: flex;
  gap: 4px;
}

.eg-shell__lang {
  min-height: 44px;
  min-width: 48px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 180ms cubic-bezier(0.16, 0.84, 0.34, 1), color 180ms cubic-bezier(0.16, 0.84, 0.34, 1);
}

.eg-shell__lang:hover {
  background: #e9edf1;
}

.eg-shell__lang--on {
  background: #dcfce7;
  color: #166534;
}

.eg-shell__foot {
  margin-top: 28px;
  padding: 0 4px;
}

.eg-shell__note {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 14.5px;
}

.eg-shell__mark {
  margin: 16px 0 0;
  color: #94a3b8;
  font-size: 14.5px;
}

@media (prefers-reduced-motion: reduce) {
  .eg-shell__lang { transition: none; }
}
</style>
