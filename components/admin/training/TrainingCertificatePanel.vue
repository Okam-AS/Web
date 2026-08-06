<template>
  <section class="trn-certs">
    <h2 class="trn-certs__title">
      {{ $i('trn_certs_title') }}
    </h2>

    <p v-if="listing.state === 'unknown'" class="trn-note trn-note--unknown" data-test="certificates-unknown">
      {{ $i('trn_certs_unknown') }}
    </p>
    <p v-else-if="listing.state === 'refused'" class="trn-note trn-note--refused" data-test="certificates-refused">
      {{ $i('trn_certs_refused') }}
    </p>
    <p v-else-if="!rows.length" class="trn-note" data-test="certificates-empty">
      {{ $i('trn_certs_empty') }}
    </p>
    <template v-else>
      <div class="trn-table-scroll">
        <table class="trn-table" data-test="certificates-table">
          <thead>
            <tr>
              <th>{{ $i('trn_col_person') }}</th>
              <th>{{ $i('trn_col_type') }}</th>
              <th>{{ $i('trn_col_issuer') }}</th>
              <th>{{ $i('trn_col_issue') }}</th>
              <th>{{ $i('trn_col_expiry') }}</th>
              <th>{{ $i('trn_col_status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.certificateId" data-test="certificate-row">
              <td>
                <span class="trn-ref" :title="row.personRef">{{ personName(row.personRef) }}</span>
              </td>
              <td>{{ row.type || dash }}</td>
              <td>{{ row.issuer || dash }}</td>
              <!-- Both dates are the authored day, sliced off the wire and never run through a zone.
                   See `civilDateOf`: whether the stored midnight is UTC or store-local is an open
                   ruling, and slicing is the only rendering that is right under both answers. -->
              <td>{{ row.issueDate || dash }}</td>
              <td>
                <span :title="row.hasExpiry ? null : $i('trn_cert_no_expiry')">{{ row.expiryDate || dash }}</span>
              </td>
              <td>
                <span v-if="row.status === null" :title="$i('trn_status_unknown')">{{ dash }}</span>
                <span v-else class="trn-badge" :class="statusTone(row.status)">{{ statusLabel(row.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="trn-form__hint" data-test="certificates-status-note">
        {{ statusNote }}
      </p>
    </template>

    <form class="trn-form" data-test="certificate-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_cert_new_title') }}
      </h3>
      <TrainingReferenceField
        v-model="form.personRef"
        :label="$i('trn_cert_person')"
        :directory="peopleDirectory"
        kind="person"
        test-id="certificate-person"
        :disabled="busy"
      />
      <p class="trn-form__hint" data-test="certificate-person-note">
        {{ $i('trn_cert_person_known') }}
      </p>
      <p v-if="referenceMalformed" class="trn-note trn-note--blocked" data-test="certificate-person-malformed">
        {{ $i('trn_reference_malformed') }}
      </p>
      <label class="trn-form__label">
        {{ $i('trn_cert_type') }}
        <input v-model="form.type" class="trn-form__input" type="text" data-test="certificate-type">
      </label>
      <p class="trn-form__hint">
        {{ $i('trn_cert_type_hint') }}
      </p>
      <label class="trn-form__label">
        {{ $i('trn_cert_issuer') }}
        <input v-model="form.issuer" class="trn-form__input" type="text" data-test="certificate-issuer">
      </label>
      <label class="trn-form__label">
        {{ $i('trn_cert_issue') }}
        <input v-model="form.issueDate" class="trn-form__input" type="date" data-test="certificate-issue">
      </label>
      <label class="trn-form__label">
        {{ $i('trn_cert_expiry') }}
        <input v-model="form.expiryDate" class="trn-form__input" type="date" data-test="certificate-expiry">
      </label>
      <p class="trn-form__hint">
        {{ $i('trn_cert_expiry_hint') }}
      </p>
      <p v-if="expiryBeforeIssue" class="trn-note trn-note--blocked" data-test="certificate-expiry-order">
        {{ $i('trn_cert_expiry_before_issue') }}
      </p>
      <label class="trn-form__label">
        {{ $i('trn_cert_document') }}
        <input v-model="form.documentReference" class="trn-form__input" type="text" data-test="certificate-document">
      </label>
      <button class="trn-btn trn-btn--primary" type="submit" :disabled="!canSubmit" data-test="certificate-submit">
        {{ $i('trn_cert_submit') }}
      </button>
      <p v-if="writeBlocked" class="trn-note trn-note--blocked" data-test="certificate-write-blocked">
        {{ writeBlocked }}
      </p>
    </form>
  </section>
</template>

<script>
import TrainingReferenceField from '~/components/admin/training/TrainingReferenceField.vue';
import { certificateRow, instantLabel, toApiDate, directoryMatch, isReferenceId } from '~/utils/training/journey';

/**
 * The certificate vault — externally-issued competence, filed as dated evidence.
 *
 * STATUS IS READ, NEVER RECOMPUTED. `Valid`/`Expiring`/`Expired` is a pure server-side projection
 * over the expiry and the server's clock (`TrainingCertificateStatusProjection`), explicitly never
 * stored and explicitly never a blocking claim. Recomputing it here would produce a second opinion
 * about whether a food-hygiene certificate is current, from a browser clock, and there is no reading
 * on which that is an improvement. The panel therefore prints what the server said and, underneath,
 * the moment the server said it.
 *
 * WHAT IS NOT HERE. The expiry FEED (`GET …/certificates/expiring?withinDays`) is not bound by this
 * surface at all: it compares the stored expiry against a UTC horizon with no store-zone resolution,
 * which is TR-B3, still open. A "certificates expiring in the next N days" panel is precisely the
 * screen whose correctness would turn on that ruling, so this one lists the vault and lets the
 * server's own status speak, rather than building a countdown on an unsettled epoch.
 *
 * THE PERSON REFERENCE IS BOUND, AND THE FORM SAYS THAT INSTEAD. It used to say the server checks
 * only that the id is non-empty — that stopped being true when `RegisterCertificateAsync` started
 * calling `TrainingPersonBinding.RequireKnownPersonAsync`, which refuses an id that identifies no
 * `WorkforcePerson` with a 400 and files nothing. The check is EXISTENCE, estate-wide and across
 * every person state, and deliberately not employment: `Invited` is what a certificate filed before
 * the engagement exists looks like, and `Archived` is what late filing of historical evidence looks
 * like. So the hint says a known person is required and does not overclaim that the person works
 * here — which the server still does not check.
 *
 * THE FORM PRE-EMPTS EVERY OTHER 400 THIS ROUTE CAN THROW, which is what lets the page attribute the
 * remaining one. `RegisterCertificateAsync` refuses a missing body (always sent), an empty person
 * reference and a non-GUID one (`isReferenceId`), a blank type (required), an expiry preceding the
 * issue date (`expiryBeforeIssue`) — and an unknown person, which no client can check. The last is
 * therefore the only `training.validation` this form can still produce, and the page names it.
 */
export default {
  name: 'TrainingCertificatePanel',
  components: { TrainingReferenceField },
  props: {
    /** `readListing(payload, error, 'certificates')`. */
    listing: { type: Object, required: true },
    /** `personDirectory(...)` — an assist for the reference field, never a gate on it. */
    peopleDirectory: { type: Object, default: () => ({ state: 'unknown', options: [] }) },
    locale: { type: String, default: 'no' },
    zoneId: { type: String, default: null },
    /** `training.setup`: true, false, or null for UNKNOWN. Null never disables a control. */
    setupFlag: { type: Boolean, default: null },
    busy: { type: Boolean, default: false }
  },
  data () {
    return { form: { personRef: '', type: '', issuer: '', issueDate: '', expiryDate: '', documentReference: '' } };
  },
  computed: {
    dash () { return '—'; },
    rows () {
      return (this.listing.rows || []).map(certificateRow);
    },
    /**
     * The status column is only as current as the moment the server evaluated it, so that moment is
     * printed with it. When the read carried no `asOfUtc` the sentence says the moment is unknown
     * rather than substituting the reader's own clock.
     */
    statusNote () {
      const asOf = instantLabel(this.listing.asOf, this.locale, this.zoneId);
      return asOf
        ? this.$i('trn_certs_status_asof', { asOf })
        : this.$i('trn_certs_status_asof_unknown');
    },
    writeBlocked () {
      return this.setupFlag === false ? this.$i('trn_writes_blocked_setup') : '';
    },
    /** Typed, and not a GUID: `PersonRef` binds to a `Guid`, so this would fail model binding. */
    referenceMalformed () {
      const typed = this.form.personRef.trim();
      return !!typed && !isReferenceId(typed);
    },
    /**
     * The server slices BOTH dates to midnight before comparing, so the same day is never out of
     * order. The comparison here is between two `YYYY-MM-DD` strings, which is that same day-level
     * comparison and — unlike a `Date` round trip — carries no zone at all.
     */
    expiryBeforeIssue () {
      const issue = this.form.issueDate;
      const expiry = this.form.expiryDate;
      return !!issue && !!expiry && expiry < issue;
    },
    canSubmit () {
      return !this.busy &&
        isReferenceId(this.form.personRef) &&
        !!this.form.type.trim() &&
        !!toApiDate(this.form.issueDate) &&
        !this.expiryBeforeIssue;
    }
  },
  methods: {
    /** A filed reference named, when the directory can name it. The id stays on the title either way. */
    personName (personRef) {
      const match = directoryMatch(this.peopleDirectory, personRef);
      return match ? match.label : (personRef || this.dash);
    },
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
      this.$emit('register-certificate', {
        personRef: this.form.personRef.trim(),
        type: this.form.type.trim(),
        issuer: this.form.issuer.trim() || null,
        issueDateUtc: toApiDate(this.form.issueDate),
        // An empty expiry is null, which the backend models as a certificate that never expires —
        // a real, permanent Valid rather than an unknown one. It is never sent as an empty string.
        expiryDateUtc: toApiDate(this.form.expiryDate),
        documentReference: this.form.documentReference.trim() || null
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-certs__title {
  @extend %trn-panel-title;
}
</style>
