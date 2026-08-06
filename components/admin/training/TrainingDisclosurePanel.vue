<template>
  <section class="trn-disclosure">
    <h2 class="trn-disclosure__title">
      {{ $i(titleKey) }}
    </h2>
    <p class="trn-form__hint">
      {{ $i(introKey) }}
    </p>

    <form v-if="asksForAPerson" class="trn-form" data-test="disclosure-form" @submit.prevent="submit">
      <TrainingReferenceField
        v-model="personRef"
        :label="$i('trn_disclosure_person')"
        :directory="peopleDirectory"
        kind="person"
        test-id="disclosure-person"
        :disabled="busy"
      />
      <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="disclosure-person-malformed">
        {{ $i('trn_reference_malformed') }}
      </p>
      <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="disclosure-lookup">
        {{ $i('trn_disclosure_lookup') }}
      </button>
    </form>

    <p v-if="log.state === 'idle'" class="trn-note" data-test="disclosure-idle">
      {{ $i('trn_disclosure_prompt') }}
    </p>
    <p v-else-if="log.state === 'unknown'" class="trn-note trn-note--unknown" data-test="disclosure-unknown">
      {{ $i('trn_disclosure_unknown') }}
    </p>
    <!-- A refusal is NEVER rendered as an empty log. "Nobody has looked" and "you may not ask" are
         different facts, and only one of them is reassuring. -->
    <p v-else-if="log.state === 'refused'" class="trn-note trn-note--refused" data-test="disclosure-refused">
      {{ $i('trn_disclosure_refused') }}
    </p>
    <div v-else class="trn-disclosure__answer" data-test="disclosure-answer">
      <p v-if="!log.entries.length" class="trn-note" data-test="disclosure-empty">
        {{ $i('trn_disclosure_empty') }}
      </p>
      <template v-else>
        <p class="trn-disclosure__summary" data-test="disclosure-summary">
          {{ $i('trn_disclosure_summary', { entries: log.entries.length, readers: readerCount }) }}
        </p>
        <div class="trn-table-scroll">
          <table class="trn-table" data-test="disclosure-table">
            <thead>
              <tr>
                <th>{{ $i('trn_col_when') }}</th>
                <th>{{ $i('trn_col_who') }}</th>
                <th>{{ $i('trn_col_what') }}</th>
                <th>{{ $i('trn_col_size') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in log.entries" :key="index" data-test="disclosure-row">
                <td>{{ whenLabel(entry) }}</td>
                <td>
                  <span v-if="entry.actorIsSubject" class="trn-badge trn-badge--on" data-test="disclosure-actor-self">
                    {{ $i('trn_disclosure_actor_self') }}
                  </span>
                  <code v-else class="trn-disclosure__actor" data-test="disclosure-actor">{{ entry.actorReference || dash }}</code>
                </td>
                <td>{{ eventLabel(entry) }}</td>
                <td>{{ sizeLabel(entry) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p class="trn-form__hint" data-test="disclosure-no-names">
        {{ $i('trn_disclosure_no_names') }}
      </p>
      <p class="trn-form__hint" data-test="disclosure-recorded">
        {{ $i('trn_disclosure_recorded') }}
      </p>
    </div>
  </section>
</template>

<script>
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import { DISCLOSURE_EVIDENCE_READ, DISCLOSURE_LOG_READ, distinctReaders } from '~/utils/training/disclosure';
import { instantLabel, isReferenceId } from '~/utils/training/journey';

/**
 * WHO HAS LOOKED AT THIS PERSON'S TRAINING RECORD.
 *
 * Every evidence read has appended a disclosure keyed to the person since that read landed, and for
 * as long as no route returned one the fact was captured and unreadable — including by its subject.
 * This panel is the screen that produces it, and it is mounted twice: on the manager page, where a
 * person is named, and on the worker's own page, where the server resolves the subject from the
 * token and no field is offered at all. `asksForAPerson` is the only difference.
 *
 * IT NAMES NOBODY, AND THAT IS A DECISION RATHER THAN A GAP. The server hands over the PII-minimized
 * actor reference its ledger stores; resolving that to a display name would be a disclosure ABOUT
 * THE READER, made to whoever the log is about, that nobody authorised. So the reference is printed
 * as the id it is, with one derivation the server does make — `actorIsSubject`, which separates "I
 * opened my own file" from "somebody else did". A future lane may decide the name question; it is
 * not decided here by a join in a table cell.
 *
 * READING THIS IS RECORDED. Opening the panel is itself a disclosure and appends a row the subject
 * will see, which is why nothing here refreshes on a timer and why the manager side is behind an
 * explicit lookup rather than loaded with the page.
 */
export default {
  name: 'TrainingDisclosurePanel',
  components: { TrainingReferenceField },
  props: {
    /** `readDisclosures(payload, error)`, or `{ state: 'idle' }` before anybody has asked. */
    log: { type: Object, required: true },
    /** True on the manager surface, where a subject must be named. False on the worker's own page. */
    asksForAPerson: { type: Boolean, default: true },
    /** `personDirectory(...)` — an assist for the reference field, never a gate on it. */
    peopleDirectory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { personRef: '' };
  },
  computed: {
    dash () { return '—'; },
    titleKey () {
      return this.asksForAPerson ? 'trn_disclosure_title' : 'trn_disclosure_title_own';
    },
    introKey () {
      return this.asksForAPerson ? 'trn_disclosure_intro' : 'trn_disclosure_intro_own';
    },
    readerCount () {
      return distinctReaders(this.log.entries);
    },
    referenceMalformed () {
      const typed = this.personRef.trim();
      return !!typed && !isReferenceId(typed);
    },
    canSubmit () {
      return !this.busy && isReferenceId(this.personRef);
    }
  },
  methods: {
    whenLabel (entry) {
      return instantLabel(entry.occurredAt, this.locale, this.zoneId) || this.dash;
    },
    eventLabel (entry) {
      if (entry.eventType === DISCLOSURE_EVIDENCE_READ) { return this.$i('trn_disclosure_event_evidence'); }
      if (entry.eventType === DISCLOSURE_LOG_READ) { return this.$i('trn_disclosure_event_log'); }
      // A server newer than this build. Printing the raw type is honest; guessing at it is not.
      return entry.eventType || this.dash;
    },
    /**
     * How much was handed over. An entry whose payload could not be parsed prints the dash rather
     * than a zero — "we could not read the snapshot" and "nothing was disclosed" are not the same
     * statement about somebody's record.
     */
    sizeLabel (entry) {
      const counts = entry.counts;
      if (!counts) { return this.dash; }
      if (entry.eventType === DISCLOSURE_LOG_READ) {
        return counts.disclosures === null
          ? this.dash
          : this.$i('trn_disclosure_size_log', { entries: counts.disclosures });
      }
      if (counts.completions === null && counts.certificates === null) { return this.dash; }
      return this.$i('trn_disclosure_size_evidence', {
        completions: counts.completions === null ? this.dash : counts.completions,
        certificates: counts.certificates === null ? this.dash : counts.certificates
      });
    },
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('lookup', this.personRef.trim());
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-disclosure__title {
  @extend %trn-panel-title;
}

.trn-disclosure__summary {
  font-size: 0.95em;
  color: #292c34;
  margin: 0 0 12px;
}

.trn-disclosure__actor {
  font-size: 0.85em;
  color: #64748b;
  word-break: break-all;
}
</style>
