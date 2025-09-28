<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-icon">
        {{ error.statusCode === 404 ? "404" : "!" }}
      </div>
      <h1 class="error-title">
        {{ error.statusCode === 404 ? "Oops! Siden finnes ikke" : "Beklager! En feil oppstod" }}
      </h1>
      <p class="error-message">
        {{ error.statusCode === 404 ? "Siden du leter etter kan ha blitt flyttet eller slettet." : "Noe gikk galt. Vennligst prøv igjen senere." }}
      </p>
      <nuxt-link
        to="/"
        class="error-button"
      >
        Gå til forsiden
      </nuxt-link>
    </div>
  </div>
</template>

<script>
export default {
  props: ["error"],
  head() {
    return {
      title: this.error.statusCode === 404 ? "Side ikke funnet" : "Feil",
    };
  },
};
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #f8f9fa;
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  font-size: 6rem;
  font-weight: bold;
  color: #1bb776;
  margin-bottom: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(45deg, #1bb776, #23d890);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.error-title {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.error-message {
  color: #6c757d;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.error-button {
  display: inline-block;
  padding: 0.8rem 1.5rem;
  background: linear-gradient(45deg, #1bb776, #23d890);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
