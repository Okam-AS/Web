<template>
  <section class="trn-holdings">
    <h2 class="trn-holdings__title">
      {{ $i('trn_holdings_title') }}
    </h2>
    <p class="trn-form__hint">
      {{ $i('trn_holdings_intro') }}
    </p>

    <form class="trn-form" data-test="holdings-form" @submit.prevent="submit">
      <TrainingReferenceField
        v-model="personRef"
        :label="$i('trn_holdings_person')"
        :directory="peopleDirectory"
        kind="person"
        test-id="holdings-person"
        :disabled="busy"
      />
      <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="holdings-person-malformed">
        {{ $i('trn_reference_malformed') }}
      </p>
      <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="holdings-lookup">
        {{ $i('trn_holdings_lookup') }}
      </button>
    </form>

    <p v-if="holdings.state === 'idle'" class="trn-note" data-test="holdings-idle">
      {{ $i('trn_holdings_prompt') }}
    </p>
    <p v-else-if="holdings.state === 'unknown'" class="trn-note trn-note--unknown" data-test="holdings-unknown">
      {{ $i('trn_holdings_unknown') }}
    </p>
    <p v-else-if="holdings.state === 'refused'" class="trn-note trn-note--refused" data-test="holdings-refused">
      {{ $i('trn_holdings_refused') }}
    </p>
    <div v-else class="trn-holdings__answer" data-test="holdings-answer">
      <h3 class="trn-holdings__sub">
        {{ $i('trn_holdings_keys_title') }}
      </h3>
      <p v-if="!holdings.keys.length" class="trn-note" data-test="holdings-no-keys">
        {{ $i('trn_holdings_no_keys') }}
      </p>
      <ul v-else class="trn-holdings__keys" data-test="holdings-keys">
        <li v-for="key in holdings.keys" :key="key" class="trn-badge trn-badge--on">
          {{ key }}
        </li>
      </ul>

      <h3 class="trn-holdings__sub">
        {{ $i('trn_holdings_certs_title') }}
      </h3>
      <p v-if="!certificates.length" class="trn-note" data-test="holdings-no-certs">
        {{ $i('trn_holdings_no_certs') }}
      </p>
      <table v-else class="trn-table" data-test="holdings-certs">
        <thead>
          <tr>
            <th>{{ $i('trn_col_type') }}</th>
            <th>{{ $i('trn_col_issuer') }}</th>
            <th>{{ $i('trn_col_issue') }}</th>
            <th>{{ $i('trn_col_expiry') }}</th>
            <th>{{ $i('trn_col_status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(cert, index) in certificates" :key="cert.type + '-' + index" data-test="holdings-cert-row">
            <td>{{ cert.type || dash }}</td>
            <td>{{ cert.issuer || dash }}</td>
            <td>{{ cert.issueDate || dash }}</td>
            <td>
              <span :title="cert.hasExpiry ? null : $i('trn_cert_no_expiry')">{{ cert.expiryDate || dash }}</span>
            </td>
            <td>
              <span v-if="cert.status === null" :title="$i('trn_status_unknown')">{{ dash }}</span>
              <span v-else class="trn-badge" :class="statusTone(cert.status)">{{ statusLabel(cert.status) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="trn-form__hint" data-test="holdings-not-a-verdict">
        {{ $i('trn_holdings_not_a_verdict') }}
      </p>
      <p class="trn-form__hint" data-test="holdings-asof">
        {{ asOfNote }}
      </p>
    </div>
  </section>
</template>

<script>
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import { certificateRow, instantLabel, isReferenceId } from '~/utils/training/journey';

/**
 * THE END OF THE JOURNEY, and the only panel that proves the rest of it did anything.
 *
 * Everything upstream can succeed and still mean nothing: a course can be authored, a version
 * published, an assignment made and a completion filed, and the question a venue actually has —
 * "does this person hold the competence?" — is answered by a different projection entirely. This
 * panel asks it. A competency key appearing here is the visible consequence of a passing completion
 * of a course that carried that key; a certificate appearing here is the same fact arriving from
 * outside the platform. That is the loop closing.
 *
 * POSSESSION, NEVER A VERDICT. `TrainingCompetencyService` returns held facts only: it stores no
 * role requirement and issues no qualification judgement, and Workforce reads an absent fact as
 * UNKNOWN rather than as a failure (spec §7.3). So an empty answer here says "no fact is recorded",
 * and the panel says exactly that — never "not qualified", which is a claim nothing on this surface
 * is entitled to make.
 *
 * EXPIRED CERTIFICATES ARE ABSENT FROM THIS READ BY DESIGN — the projection filters them out, so
 * "not listed here" and "expired" are the same shape. The vault panel above is where a certificate's
 * whole history, expired ones included, is visible; this list is the possession set.
 */
export default {
  name: 'TrainingHoldingsPanel',
  components: { TrainingReferenceField },
  props: {
    /**
     * `readHoldings(payload, error)`, or `{ state: 'idle' }` before anybody has asked. Idle is a
     * fourth state on purpose: "nobody has looked up a person yet" is not an unknown read and must
     * not render as one.
     */
    holdings: { type: Object, required: true },
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
    certificates () {
      return (this.holdings.certificates || []).map(certificateRow);
    },
    asOfNote () {
      const asOf = instantLabel(this.holdings.asOf, this.locale, this.zoneId);
      return asOf ? this.$i('trn_holdings_asof', { asOf }) : this.$i('trn_holdings_asof_unknown');
    },
    /**
     * Typed, and not a GUID. `GET …/competency/holdings?person=` binds a `Guid` query parameter, so
     * anything else is a framework 400 carrying no `training.*` code — indistinguishable, from the
     * page's error mapping, from a network failure.
     */
    referenceMalformed () {
      const typed = this.personRef.trim();
      return !!typed && !isReferenceId(typed);
    },
    canSubmit () {
      return !this.busy && isReferenceId(this.personRef);
    }
  },
  methods: {
    statusLabel (status) {
      const key = { Valid: 'trn_status_valid', Expiring: 'trn_status_expiring', Expired: 'trn_status_expired' }[status];
      return key ? this.$i(key) : status;
    },
    statusTone (status) {
      if (status === 'Valid') { return 'trn-badge--on'; }
      if (status === 'Expiring') { return 'trn-badge--warn'; }
      if (status === 'Expired') { return 'trn-badge--off'; }
      return '';
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

.trn-holdings__title {
  @extend %trn-panel-title;
}

.trn-holdings__sub {
  font-size: 0.9em;
  font-weight: 600;
  color: #292c34;
  margin: 16px 0 8px;
}

.trn-holdings__keys {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
