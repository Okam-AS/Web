<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Ansatte<template v-if="storeName"> – {{ storeName }}</template></h3>
        <button class="close-btn" @click="closeModal">
          <span class="material-icons">close</span>
        </button>
      </div>
      <div class="modal-body">
        <EmployeeManager :store-id="storeId" />
      </div>
    </div>
  </div>
</template>

<script>
import EmployeeManager from '~/components/molecules/EmployeeManager.vue'

export default {
  name: 'EmployeeManagerModal',
  components: { EmployeeManager },
  props: {
    storeId: {
      type: Number,
      required: true,
    },
    storeName: {
      type: String,
      default: '',
    },
  },
  mounted() {
    document.body.style.overflow = 'hidden'
  },
  beforeDestroy() {
    document.body.style.overflow = ''
  },
  methods: {
    closeModal() {
      document.body.style.overflow = ''
      this.$emit('close')
    },
  },
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: #fafbfc;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #292c34;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  padding: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.close-btn .material-icons {
  font-size: 24px;
}

.modal-body {
  padding: 24px;
}

/* The inner EmployeeManager has bottom margins on its sections; trim the last one */
.modal-body >>> .form-section:last-of-type {
  margin-bottom: 0;
}
</style>
