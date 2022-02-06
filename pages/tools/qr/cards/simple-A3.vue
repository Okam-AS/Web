<template>
  <div class="simpleA3">
    <div v-if="store && store.id" class="content">
      <h2>
        Skann QR-kode med kamera og bestill mat og drikke direkte til bordet
      </h2>
      <div>
        <VueQrcode
          v-if="qrValue"
          class="qrcode qrContainer float-left"
          :value="qrValue"
          tag="img"
          :options="{ width: qrSize }"
        />
        <div
          class="tableContainer float-left"
          :style="
            'width:' + (qrSize + 10) + 'px;height: ' + (qrSize + 10) + 'px;'
          "
        >
          <span class="tableNameLabel">Bordnummer</span>
          <span class="tableName">7</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode'

export default {
  components: { VueQrcode },
  props: {
    store: {
      type: Object,
      default: () => {}
    },
    qrValue: {
      type: String,
      default: ''
    },
    qrSize: {
      type: Number,
      default: 150
    }
  }
}
</script>
<style scoped>
h2 {
  color: white;
}
.content {
  /* transform: rotate(270deg); */
}
.simpleA3 {
  border-right: 1px dashed rgba(127, 192, 162, 1);
  border-bottom: 1px dashed rgba(127, 192, 162, 1);
  background: rgb(127, 192, 162);
  background: radial-gradient(
    circle,
    rgba(127, 192, 162, 1) 0%,
    rgba(54, 174, 120, 1) 100%
  );
}
.tableContainer,
.qrContainer {
  border-radius: 20px;
  background: white;
  border: 5px solid #1b975f;
}
.tableContainer {
  margin-left: 20px;
  display: flex;
  align-items: center;
  flex-direction: column;
}
.tableName {
  text-align: center;
  margin: 0 auto;
  font-size: 90px;
}
.tableNameLabel {
  color: #1b975f;
  font-weight: bold;
  text-align: center;
}
.float-left {
  float: left;
}
</style>