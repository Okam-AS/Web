<template>
  <div
    class="vat-autocomplete-input"
    style="position: relative"
  >
    <slot name="label">
      <label :for="inputId">Organisasjonsnummer (VAT)</label>
    </slot>
    <input
      :id="inputId"
      ref="vatInput"
      v-model="vatInputValue"
      type="text"
      class="form-control"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <ul
      v-if="showDropdown && filteredStores.length > 0"
      class="autocomplete-list"
    >
      <li
        v-for="store in filteredStores"
        :key="store.id"
        class="autocomplete-item"
        @mousedown.prevent="selectStore(store)"
      >
        <span class="vat">{{ store.vat }}</span>
        <span class="name">{{ store.name }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "VatAutocompleteInput",
  props: {
    value: {
      type: [String, Number],
      default: "",
    },
    stores: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: "Skriv inn org.nr eller velg fra listen",
    },
    inputId: {
      type: String,
      default: "vat-autocomplete-input",
    },
  },
  data() {
    return {
      vatInputValue: this.value,
      showDropdown: false,
    };
  },
  computed: {
    filteredStores() {
      const input = this.vatInputValue?.trim()?.toLowerCase() || "";
      console.log("[VAT AUTOCOMPLETE] filteredStores input:", input, "stores count:", this.stores.length);
      if (!Array.isArray(this.stores)) {
        console.log("[VAT AUTOCOMPLETE] stores is not an array!", this.stores);
        return [];
      }
      if (this.stores.length > 0) {
        // Print the first few store objects for inspection
        console.log("[VAT AUTOCOMPLETE] stores sample:", this.stores.slice(0, 3));
        // Print all VATs for debugging
        console.log("[VAT AUTOCOMPLETE] all VATs:", this.stores.map((s) => s && s.vat).filter(Boolean));
      }
      if (!input) {
        const filtered = this.stores.filter((s) => s && s.vat !== undefined && String(s.vat).length > 0);
        console.log("[VAT AUTOCOMPLETE] filteredStores (empty input) result:", filtered, "count:", filtered.length);
        return filtered;
      }
      const filtered = this.stores.filter((s) => s && s.vat !== undefined && (String(s.vat).toLowerCase().includes(input) || (s.name && typeof s.name === "string" && s.name.toLowerCase().includes(input))));
      console.log("[VAT AUTOCOMPLETE] filteredStores result:", filtered, "count:", filtered.length);
      return filtered;
    },
  },
  watch: {
    value(val) {
      this.vatInputValue = val;
    },
    stores: {
      handler(newVal) {
        console.log("[VAT AUTOCOMPLETE] stores prop changed", newVal);
      },
      immediate: true,
      deep: true,
    },
    vatInputValue(newVal) {
      console.log("[VAT AUTOCOMPLETE] vatInputValue changed", newVal);
    },
  },
  mounted() {
    console.log("[VAT AUTOCOMPLETE] mounted with stores:", this.stores);
  },
  methods: {
    onInput() {
      this.$emit("input", this.vatInputValue);
      this.showDropdown = true;
      console.log("[VAT AUTOCOMPLETE] input event, showDropdown set to", this.showDropdown, "input:", this.vatInputValue);
    },
    onFocus() {
      this.showDropdown = true;
      console.log("[VAT AUTOCOMPLETE] input focused, showDropdown set to", this.showDropdown);
    },
    selectStore(store) {
      this.vatInputValue = store.vat;
      this.$emit("input", store.vat);
      this.showDropdown = false;
    },
    onBlur() {
      setTimeout(() => {
        this.showDropdown = false;
      }, 150);
    },
  },
};
</script>

<style scoped>
.vat-autocomplete-input {
  margin-bottom: 1.5rem;
}

.vat-autocomplete-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
}

.vat-autocomplete-input .form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 1rem;
  transition: border-color 0.15s ease-in-out;
  background-color: white;
}

.vat-autocomplete-input .form-control:focus {
  border-color: #1bb776;
  outline: none;
}

.autocomplete-list {
  position: absolute;
  z-index: 10;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 0.25rem 0.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-top: -4px;
  max-height: 220px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
}

.autocomplete-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  font-size: 1rem;
  transition: background 0.15s;
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover,
.autocomplete-item:focus {
  background: #f7fafc;
}

.autocomplete-item .vat {
  font-weight: 600;
  color: #2d3748;
}

.autocomplete-item .name {
  color: #718096;
  margin-left: 1rem;
  font-size: 0.95em;
}
</style>
