<template>
  <div class="phone-pad">
    <div class="phone-pad__display" :class="{ 'phone-pad__display--empty': !value }">
      {{ value || placeholder }}
    </div>
    <PosNumpad @key="onKey" @backspace="onBack" @clear="onClear" />
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// On-screen numeric entry for a phone number, so the register needs no keyboard (WP-A5). The value
// is a digit string owned by the parent (v-model). Capped at 15 digits (E.164 max).
export default {
  name: 'PhonePad',
  components: { PosNumpad },
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: 'Telefonnummer' }
  },
  methods: {
    onKey (d) {
      if ((this.value || '').length >= 15) { return; }
      this.$emit('input', (this.value || '') + d);
    },
    onBack () {
      this.$emit('input', (this.value || '').slice(0, -1));
    },
    onClear () {
      this.$emit('input', '');
    }
  }
};
</script>

<style scoped>
.phone-pad__display {
  height: 52px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--pos-ink, #292c34);
  margin-bottom: 12px;
}
.phone-pad__display--empty { color: #a0aec0; font-weight: 500; letter-spacing: normal; }
</style>
