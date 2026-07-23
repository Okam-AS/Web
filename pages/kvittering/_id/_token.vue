<template>
  <div class="receipt-page">
    <div v-if="loading" class="receipt-page__state">
      Henter kvittering …
    </div>
    <div v-else-if="error" class="receipt-page__state receipt-page__state--error">
      Fant ikke kvitteringen. Sjekk at lenken er komplett.
    </div>
    <div v-else class="receipt-page__paper">
      <PosReceiptView :receipt="receipt" />
    </div>
  </div>
</template>

<script>
// Public electronic receipt (§ 2-8-4 electronic form) behind the tokenized SMS link:
// GET /pos/receipt/public/{journalEntryId}/{token} — no login, the token gates access.
import axios from 'axios';
import $config from '~/core/helpers/configuration';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';

export default {
  name: 'PublicReceiptPage',
  components: { PosReceiptView },
  layout: 'empty',
  data () {
    return { loading: true, error: false, receipt: null };
  },
  async mounted () {
    try {
      const { id, token } = this.$route.params;
      const res = await axios.get(`${$config.okamApiBaseUrl}/pos/receipt/public/${encodeURIComponent(id)}/${encodeURIComponent(token)}`);
      this.receipt = res.data;
    } catch (e) {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }
};
</script>

<style scoped>
.receipt-page { min-height: 100vh; background: #f1f5f9; display: flex; justify-content: center; padding: 24px 12px; }
.receipt-page__paper { width: 100%; max-width: 420px; }
.receipt-page__state { padding: 48px 16px; color: #475569; font-size: 15px; }
.receipt-page__state--error { color: #b91c1c; }
</style>
