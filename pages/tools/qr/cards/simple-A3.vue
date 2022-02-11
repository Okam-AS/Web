<template>
  <div class="simple-a3">
    <div v-if="store && store.id" class="content">
      <h2>
        {{ cardText }}
      </h2>
      <div class="qr-row">
        <VueQrcode
          v-if="qrValue"
          class="qr-code qr-container"
          :value="qrValue"
          tag="img"
          :options="{ width: qrSize }"
        />
        <div
          v-if="tableName"
          class="table-container"
          :style="
            'width:' + (qrSize + 10) + 'px;height: ' + (qrSize + 10) + 'px;'
          "
        >
          <span class="table-name__label">Bordnummer</span>
          <span class="table-name">{{ tableName }}</span>
        </div>
      </div>
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 836.826 175.846">
          <path
            d="M330.7,154.371a14.251,14.251,0,0,1-7.139,18.849,29.732,29.732,0,0,1-33.265-6.11l-65.674-65.843V157a18.613,18.613,0,1,1-37.225,0V23.4a18.613,18.613,0,1,1,37.225,0V79.136L290.14,13.453A29.732,29.732,0,0,1,323.4,7.343a14.253,14.253,0,0,1,4.259,23.036L268.263,90.2l59.56,59.983A14.247,14.247,0,0,1,330.7,154.371ZM169.105,90.04c0,47.261-37.855,85.573-84.552,85.573S0,137.3,0,90.04,37.856,4.467,84.553,4.467,169.105,42.779,169.105,90.04Zm-37.225,0c0-26.453-21.189-47.9-47.327-47.9S37.225,63.587,37.225,90.04s21.19,47.9,47.328,47.9S131.88,116.494,131.88,90.04ZM469.931,19.111A29.388,29.388,0,0,0,442.4,0a12.769,12.769,0,0,1-3.8,0,29.388,29.388,0,0,0-27.532,19.111L361.058,153.09A14.012,14.012,0,0,0,374.184,172a29.147,29.147,0,0,0,27.284-18.894L440.5,49.233l39.032,103.873A29.147,29.147,0,0,0,506.816,172a14.012,14.012,0,0,0,13.126-18.91ZM835.942,153.09,785.931,19.111A29.388,29.388,0,0,0,758.4,0c-.3,0-.6.027-.9.045-.3-.018-.6-.045-.9-.045a29.388,29.388,0,0,0-27.532,19.111L691.5,119.759,653.931,19.111A29.388,29.388,0,0,0,626.4,0c-.472,0-.939.025-1.4.071C624.54.025,624.073,0,623.6,0a29.388,29.388,0,0,0-27.532,19.111L546.058,153.09A14.012,14.012,0,0,0,559.184,172a29.147,29.147,0,0,0,27.284-18.894L625,50.563l38.532,102.543A29.147,29.147,0,0,0,690.816,172c.231,0,.456-.023.684-.035.228.012.453.035.684.035a29.147,29.147,0,0,0,27.284-18.894L757.5,51.894l38.032,101.212A29.147,29.147,0,0,0,822.816,172a14.012,14.012,0,0,0,13.126-18.91Z"
          />
        </svg>
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
    tableName: {
      type: String,
      default: ''
    },
    cardText: {
      type: String,
      default: ''
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
<style lang="scss" scoped>
@import "../../../../assets/sass/common.scss";

h2 {
  color: white;
  margin: 0 auto rem(24);
  line-height: 1.3;
  text-align: center;
}

.content {
  transform: rotate(90deg);
  position: relative;
  top: rem(140);
  left: rem(0);
  padding: 0 rem(24);
}

.simple-a3 {
  border-right: 1px dashed rgba(127, 192, 162, 1);
  border-bottom: 1px dashed rgba(127, 192, 162, 1);
  background: radial-gradient(
    circle,
    $color-support 0%,
    $color-profile-dark 100%
  );
}

.qr-row {
  display: flex;
  justify-content: center;
  column-gap: rem(24);
}

.table-container,
.qr-container {
  border-radius: rem(20);
  background: white;
  border: rem(6) solid $color-profile-dark;
}

.table-container {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.table-name {
  text-align: center;
  margin: 0 auto;
  font-size: rem(90);
  line-height: 1.2;

  &__label {
    font-weight: bold;
    text-align: center;
    margin-top: rem(8);
  }
}

.logo {
  position: absolute;
  top: rem(-45);
  left: rem(-65);

  svg {
    width: rem(70);
    fill: white;
  }
}
</style>