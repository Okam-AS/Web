<template>
  <div class="ttf">
    <div class="form-group">
      <label>
        Token-type
        <span class="ttf__meta">(kan ikke utledes fra tokenet — velg riktig spor)</span>
      </label>
      <select v-model="form.tokenType" class="form-select">
        <option value="CompanyJwt">
          BYOK / API-nøkkel (Selskap → API-nøkler)
        </option>
        <option value="EmployeeToken">
          Employee token (vår integrasjon)
        </option>
      </select>
    </div>

    <div class="form-group">
      <label>
        API-token
        <span v-if="hasToken" class="ttf__meta">(valgfritt — token er lagret)</span>
      </label>
      <textarea
        v-model="form.apiToken"
        class="form-control"
        rows="3"
        :placeholder="hasToken ? 'Token er lagret — la stå tomt for å beholde det, eller lim inn et nytt' : 'Lim inn butikkens Tripletex-token'"
      />
    </div>

    <div class="ttf__row">
      <div class="form-group">
        <label>Company id</label>
        <input v-model="form.companyId" class="form-control" placeholder="0">
      </div>
      <div class="form-group ttf__checks">
        <label><input v-model="form.accountingEnabled" type="checkbox"> Regnskapseksport aktiv</label>
        <label><input v-model="form.isActive" type="checkbox"> Aktiv</label>
      </div>
    </div>

    <p class="ttf__meta">
      Kontoene redigeres under «Kontoer». Skjemaet her sender de lagrede kontoene videre uendret, så en
      ren token-oppdatering aldri tømmer kontooppsettet.
    </p>

    <div class="ttf__actions">
      <button class="btn btn-primary" :disabled="busy || (!form.apiToken && !hasToken)" @click="save">
        {{ busy ? 'Lagrer…' : 'Lagre og valider' }}
      </button>
    </div>
  </div>
</template>

<script>
// The Tripletex credential form, split out of pages/admin/tripletex.vue so the generic accounting
// page can render it for a provider whose capabilities say "pasted token, no OAuth".
//
// Only the credential lives here; the chart of accounts is the role map's job on the new page. The
// account columns are still SENT, hydrated from the saved status, because the upsert endpoint takes
// the whole connection — dropping them would clear a store's accounts on a token change.
export default {
  name: 'TripletexTokenForm',
  props: {
    storeId: { type: Number, required: true }
  },
  data () {
    return {
      busy: false,
      status: null,
      form: {
        apiToken: '',
        tokenType: 'CompanyJwt',
        companyId: '0',
        isActive: true,
        accountingEnabled: true
      }
    };
  },
  computed: {
    hasToken () {
      return !!(this.status && this.status.hasToken);
    }
  },
  watch: {
    storeId: {
      immediate: true,
      handler () { this.load(); }
    }
  },
  methods: {
    load () {
      if (!this.storeId) { return; }
      this._tripletexService.getStatus(this.storeId)
        .then((status) => {
          this.status = status;
          if (!status || !status.exists) { return; }
          this.form = {
            apiToken: '',
            tokenType: status.tokenType || 'CompanyJwt',
            companyId: status.companyId || '0',
            isActive: status.isActive,
            // Hydrated from the stored value so re-saving never silently re-enables a paused export.
            accountingEnabled: status.accountingConfigEnabled === true
          };
        })
        .catch(e => this.$emit('notify', this.message(e, 'Kunne ikke hente Tripletex-tilkoblingen'), 'error'));
    },
    save () {
      const stored = this.status || {};
      const keep = value => (value === null || value === undefined ? '' : value);
      this.busy = true;
      this._tripletexService.upsertConnection(this.storeId, {
        ...this.form,
        bankAccountNumber: keep(stored.bankAccountNumber),
        feeAccountNumber: keep(stored.feeAccountNumber),
        cashboxAccountNumber: keep(stored.cashboxAccountNumber),
        cashDifferenceAccountNumber: keep(stored.cashDifferenceAccountNumber),
        bankDepositAccountNumber: keep(stored.bankDepositAccountNumber),
        roundingAccountNumber: keep(stored.roundingAccountNumber),
        dinteroIntermediaryAccountNumber: keep(stored.dinteroIntermediaryAccountNumber),
        surfboardIntermediaryAccountNumber: keep(stored.surfboardIntermediaryAccountNumber),
        salesAccount25Percent: keep(stored.salesAccount25Percent),
        salesAccount15Percent: keep(stored.salesAccount15Percent),
        salesAccount12Percent: keep(stored.salesAccount12Percent),
        salesAccount0Percent: keep(stored.salesAccount0Percent),
        tipsAccount: keep(stored.tipsAccount),
        receivablesAccount: keep(stored.receivablesAccount)
      })
        .then((status) => {
          this.status = status;
          this.form.apiToken = '';
          this.$emit('notify',
            status.verified ? 'Tilkobling lagret og verifisert.' : 'Lagret, men tokenet validerte ikke.',
            status.verified ? 'success' : 'error');
          this.$emit('saved');
        })
        .catch(e => this.$emit('notify', this.message(e, 'Kunne ikke lagre tilkoblingen'), 'error'))
        .finally(() => { this.busy = false; });
    },
    message (error, fallback) {
      return (error && error.response && error.response.data && error.response.data.message) ||
        (error && error.message) || fallback;
    }
  }
};
</script>

<style scoped>
.ttf__row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 1rem;
  align-items: end;
}
.ttf__checks {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.ttf__meta {
  color: #6b7280;
  font-size: 0.88rem;
}
.ttf__actions {
  margin-top: 1rem;
}
</style>
