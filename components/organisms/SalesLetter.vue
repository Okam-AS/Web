<template>
  <div class="page">
    <img
      v-if="imageUrl"
      width="100"
      :src="imageUrl"
      :alt="name"
      class="client-logo"
    >

    <h1>{{ $i('salesLetter_greeting') }} {{ name }},</h1>
    <p>
      {{ $i('salesLetter_intro', { name }) }}
    </p>

    <p>
      {{ $i('salesLetter_paragraph2') }}
    </p>

    <h3>{{ $i('salesLetter_whyTitle') }}</h3>
    <p /><div>
      <strong>{{ $i('salesLetter_benefit1Label') }}</strong> {{ $i('salesLetter_benefit1Text') }}
    </div>

    <div>
      <strong>{{ $i('salesLetter_benefit2Label') }}</strong> {{ $i('salesLetter_benefit2Text') }}
    </div>

    <div>
      <strong>{{ $i('salesLetter_benefit3Label') }}</strong> {{ $i('salesLetter_benefit3Text') }}
    </div>
    </p>

    <h3>{{ $i('salesLetter_priceTitle') }}</h3>
    <p>
      {{ $i('salesLetter_priceText', { name }) }}
    </p>

    <p>
      {{ $i('salesLetter_closingText', { name }) }}
    </p>

    <p class="signature">
      {{ $i('salesLetter_signOff') }}
      <br>
      <br><strong>André Sharghi</strong> <br>{{ $i('salesLetter_role') }} <br>(+47) 988 65 120
      <br>
      <img class="okam-logo" src="~/assets/UI/okam-png-logo.png" :alt="$i('salesLetter_okamLogoAlt')">
      <br>
      <span class="small-text">{{ $i('salesLetter_website') }}</span>
    </p>
  </div>
</template>

<style lang="scss">
.print {
  h1 {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1em;
    text-align: center;
  }
  .page {
    padding: 4em;
  }
  .okam-logo {
    padding: 0;
    margin: 0;
    height: 25px;
    margin-top: 10px;
  }
  .small-text {
    font-size: 0.8em;
  }
  .client-logo {
    margin: 0 auto;
    display: block;
    margin-bottom: 1em;
  }
}
</style>

<script>
export default {
  props: {
    name: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    }
  }
}
</script>