<template>
  <AdminPage>
    <div class="terminals">
      <header class="terminals__head">
        <h1 class="terminals__title">
          {{ $i('nav_terminals') }}
        </h1>
        <p class="terminals__intro">
          Administrer butikkens kortterminaler. Fikk du en terminal i posten fra Okam? Legg den til med
          serienummeret &mdash; den blir klar til bruk med én gang.
        </p>
      </header>

      <transition name="terminals-toast">
        <div
          v-if="toast.show"
          class="terminals__toast"
          :class="'terminals__toast--' + toast.type"
        >
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="!selectedStore" class="terminals__empty">
        Velg en butikk øverst for å administrere terminaler.
      </div>

      <template v-else>
        <!-- Add terminal -->
        <div class="tcard">
          <div class="tcard__head">
            <span class="tcard__icon">
              <svg viewBox="0 0 24 24" width="18" height="18"><path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 9l9 6 9-6"
              /></svg>
            </span>
            <div>
              <h2 class="tcard__title">
                Legg til terminal
              </h2>
              <p class="tcard__sub">
                Skriv inn serienummeret som står på terminalen eller esken.
              </p>
            </div>
          </div>

          <div class="tgrid">
            <div class="tfield">
              <label>Serienummer</label>
              <input v-model="form.serialNo" class="tinput" type="text" placeholder="f.eks. NDD500101170">
            </div>
            <div class="tfield">
              <label>Terminal-navn (valgfritt)</label>
              <input v-model="form.terminalName" class="tinput" type="text" placeholder="f.eks. Kasse 1">
            </div>
            <div class="tfield tfield--full">
              <label>Bind til kassapunkt (valgfritt)</label>
              <div class="tselect-wrap">
                <select v-model.number="form.cashPointId" class="tselect">
                  <option :value="0">
                    Ikke bind &mdash; gjør det senere
                  </option>
                  <option
                    v-for="cp in cashPoints"
                    :key="cp.cashPointId"
                    :value="cp.cashPointId"
                  >
                    {{ cp.name || cp.registerId }}{{ cp.surfboardTerminalId ? ' (har alt en terminal)' : '' }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="tcard__foot">
            <button class="tbtn tbtn--primary" :disabled="saving || !form.serialNo" @click="addTerminal">
              {{ saving ? 'Legger til&hellip;' : 'Legg til terminal' }}
            </button>
          </div>
        </div>

        <!-- Terminal list -->
        <div class="tcard">
          <div class="tcard__head tcard__head--row">
            <div>
              <h2 class="tcard__title">
                Dine terminaler
              </h2>
              <p class="tcard__sub">
                Terminaler registrert på denne butikken.
              </p>
            </div>
            <button class="tbtn tbtn--ghost" :disabled="loading" @click="loadTerminals">
              Oppdater
            </button>
          </div>

          <div class="table-wrap">
            <table class="ttable">
              <thead>
                <tr>
                  <th>Navn</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Serienr</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!terminals.length">
                  <td colspan="4" class="ttable__empty">
                    Ingen terminaler ennå. Legg til en med serienummeret over.
                  </td>
                </tr>
                <tr v-for="t in terminals" :key="t.terminalId">
                  <td class="ttable__strong">
                    {{ t.terminalName }}
                  </td>
                  <td>{{ t.terminalType }}</td>
                  <td><span :class="statusClass(t.terminalStatus)">{{ t.terminalStatus }}</span></td>
                  <td>{{ t.serialNo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';

// Store-admin self-serve terminal management. Unlike /admin/surfboard (PowerUser partner
// provisioning), this page is reachable by any store admin and operates on the store selected in the
// nav. It calls the StoreAdmin-scoped endpoints (stores/{id}/surfboard/terminals[/onboard]) that
// resolve the Surfboard merchant/store ids server-side, so staff never handle raw provider ids.
export default {
  name: 'AdminTerminals',
  components: { AdminPage },
  data () {
    return {
      terminals: [],
      cashPoints: [],
      form: { serialNo: '', terminalName: '', cashPointId: 0 },
      loading: false,
      saving: false,
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    selectedStore () {
      return this.$store.state.selectedAdminStore;
    },
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn;
    }
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler (storeId) {
        if (this.userIsLoggedIn && storeId) { this.loadStore(storeId); }
      }
    },
    userIsLoggedIn: {
      immediate: true,
      handler (isLoggedIn) {
        if (isLoggedIn && this.selectedStore) { this.loadStore(this.selectedStore); }
      }
    }
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 4500);
    },
    apiError (error, fallback) {
      const message = (error && error.message) || fallback;
      this.notify(message, 'error');
    },
    statusClass (status) {
      const s = (status || '').toUpperCase();
      if (s === 'ACTIVE' || s === 'REGISTERED') { return 'tbadge tbadge--ok'; }
      if (s === 'DE_REGISTERED' || s === 'IN_ACTIVE') { return 'tbadge tbadge--bad'; }
      return 'tbadge';
    },
    loadStore (storeId) {
      this.loadTerminals();
      this._cashPointService.GetForStore(storeId)
        .then((list) => { this.cashPoints = list || []; })
        .catch(() => { this.cashPoints = []; });
    },
    loadTerminals () {
      if (!this.selectedStore) { return; }
      this.loading = true;
      this._surfboardService
        .getStoreTerminalsForStore(this.selectedStore)
        .then((list) => { this.terminals = list || []; })
        .catch(e => this.apiError(e, 'Kunne ikke hente terminaler.'))
        .finally(() => { this.loading = false; });
    },
    addTerminal () {
      const serialNo = (this.form.serialNo || '').trim();
      if (!serialNo) {
        this.notify('Skriv inn serienummeret.', 'error');
        return;
      }
      this.saving = true;
      this._surfboardService
        .onboardTerminalBySerial(this.selectedStore, {
          serialNo,
          terminalName: this.form.terminalName || '',
          cashPointId: this.form.cashPointId > 0 ? this.form.cashPointId : undefined
        })
        .then((res) => {
          const bound = res.cashPointBound ? ' og koblet til kassapunkt' : '';
          this.notify('Terminal lagt til' + bound + '.');
          this.form = { serialNo: '', terminalName: '', cashPointId: 0 };
          this.loadStore(this.selectedStore);
        })
        .catch(e => this.apiError(e, 'Kunne ikke legge til terminalen.'))
        .finally(() => { this.saving = false; });
    }
  }
};
</script>

<style scoped>
.terminals { max-width: 900px; margin: 0 auto; padding: 24px; }
.terminals__head { margin-bottom: 20px; }
.terminals__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.terminals__intro { color: #64748b; margin: 0; max-width: 620px; line-height: 1.5; }

.terminals__toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.terminals__toast--success { background: #159f63; }
.terminals__toast--error { background: #ef4444; }
.terminals-toast-enter-active, .terminals-toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.terminals-toast-enter, .terminals-toast-leave-to { opacity: 0; transform: translateY(-8px); }

.terminals__empty {
  background: #fff;
  border: 1px dashed #d7dce3;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  color: #94a3b8;
  font-weight: 500;
}

.tcard {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 20px 22px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}
.tcard__head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
.tcard__head--row { justify-content: space-between; align-items: flex-start; }
.tcard__icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #159f63;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tcard__title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0; }
.tcard__sub { margin: 3px 0 0; color: #64748b; font-size: 0.88rem; line-height: 1.45; }
.tcard__foot { margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; }

.tgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tfield { display: flex; flex-direction: column; gap: 6px; }
.tfield--full { grid-column: 1 / -1; }
.tfield label { font-weight: 600; font-size: 0.85rem; color: #475569; }
.tinput, .tselect {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
}
.tinput:focus, .tselect:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.12);
}

.tbtn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.tbtn--primary { background: #1bb776; color: #fff; }
.tbtn--primary:hover { background: #159f63; }
.tbtn--ghost { background: #fff; color: #475569; border-color: #d1d5db; }
.tbtn--ghost:hover { background: #f8fafc; }
.tbtn:disabled { opacity: 0.55; cursor: default; }

.table-wrap { overflow-x: auto; }
.ttable { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.ttable th, .ttable td { text-align: left; padding: 0.65rem 0.7rem; border-bottom: 1px solid #f1f3f5; }
.ttable th {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ttable tbody tr:hover { background: #fafbfc; }
.ttable__strong { font-weight: 600; color: #292c34; }
.ttable__empty { color: #94a3b8; text-align: center; padding: 1.5rem; }

.tbadge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 600;
}
.tbadge--ok { background: #dcfce7; color: #166534; }
.tbadge--bad { background: #fee2e2; color: #991b1b; }

@media (max-width: 640px) {
  .tgrid { grid-template-columns: 1fr; }
}
</style>
