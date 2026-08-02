<template>
  <div
    v-if="isVisible"
    class="terms-modal-overlay"
    @click.self="closeModal"
  >
    <div class="terms-modal-container">
      <div class="terms-modal-header">
        <h2>Avtalevilkår for Okam AS</h2>
        <button
          class="close-button"
          @click="closeModal"
        >
          &times;
        </button>
      </div>
      <div class="terms-modal-content">
        <terms-content />
      </div>
    </div>
  </div>
</template>

<script>
import TermsContent from "~/components/shared/TermsContent.vue";
import bodyScrollLock from "~/utils/body-scroll-lock";

export default {
  name: "TermsModal",
  components: {
    TermsContent,
  },
  mixins: [bodyScrollLock],
  props: {
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    // Always mounted, hidden by `v-if="isVisible"` on its own root — so the lock follows the prop
    // rather than the component's lifetime. This modal is on the signup page, which is a marketing
    // page and therefore also a Swiss page: the declared class must stay an array or `okam-ch`
    // comes off the body while the terms are open.
    bodyScrollLocked() {
      return this.isVisible;
    },
  },
  methods: {
    closeModal() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.terms-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.terms-modal-container {
  background-color: white;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.terms-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.terms-modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #333;
}

.terms-modal-content {
  padding: 20px;
  overflow-y: auto;
}

.terms-date {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  font-style: italic;
}
</style>
