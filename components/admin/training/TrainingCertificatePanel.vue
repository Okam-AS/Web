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
              <span class="trn-ref">{{ row.personRef || dash }}</span>
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
      <p class="trn-form__hint" data-test="certificates-status-note">
        {{ statusNote }}
      </p>
    </template>

    <form class="trn-form" data-test="certificate-form" @submit.prevent="submit">
      <h3 class="trn-form__title">
        {{ $i('trn_cert_new_title') }}
      </h3>
      <label class="trn-form__label">
        {{ $i('trn_cert_person') }}
        <input v-model="form.personRef" class="trn-form__input" type="text" data-test="certificate-person">
      </label>
      <p class="trn-form__hint" data-test="certificate-person-note">
        {{ $i('trn_cert_person_unchecked') }}
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
import { certificateRow, instantLabel, toApiDate } from '~/utils/training/journey';

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
 * THE PERSON REFERENCE IS NOT VALIDATED, AND THE FORM SAYS SO.
 * `TrainingCertificateService.RegisterCertificateAsync` checks only that `personRef` is not
 * `Guid.Empty`; there is no employment check, so any well-formed GUID is accepted and filed as
 * statutory evidence. That gap is known and deliberately unfixed upstream (adding the check would
 * refuse writes that succeed today), so this panel states it rather than implying a check by
 * offering a picker.
 */
export default {
  name: 'TrainingCertificatePanel',
  props: {
    /** `readListing(payload, error, 'certificates')`. */
    listing: { type: Object, required: true },
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
    canSubmit () {
      return !this.busy &&
        !!this.form.personRef.trim() &&
        !!this.form.type.trim() &&
        !!toApiDate(this.form.issueDate);
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
