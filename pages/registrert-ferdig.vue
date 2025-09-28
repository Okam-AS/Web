<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="success-message">
            <div class="success-content">
              <p>Registreringen er fullført!</p>
              <p class="sub-text">Du kan nå legge inn menyen din på admin.okam.no eller i Okam Admin-appen</p>

              <div class="action-buttons">
                <a
                  href="https://admin.okam.no"
                  target="_blank"
                  class="cta-link"
                >
                  Gå til admin.okam.no
                </a>
                <a
                  href="https://okam.no/last-ned"
                  class="cta-link secondary"
                >
                  Last ned Okam Admin-appen
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from "@/components/organisms/PageHeader.vue";
import PageFooter from "@/components/organisms/PageFooter.vue";

export default {
  components: { PageHeader, PageFooter },
};
</script>

<style lang="scss" scoped>
.success-message {
  text-align: center;
  padding: 40px 20px;
  max-width: 560px;
  margin: 0 auto;

  .success-content {
    background: #d5f6e5;
    padding: 32px;
    border-radius: 8px;
  }

  p {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .sub-text {
    margin-top: 16px;
    font-size: 16px;
    font-weight: normal;
    color: #666;
  }

  .action-buttons {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .cta-link {
      margin: 0;
      text-decoration: none;
      width: 100%;
      background: #1bb776;
      color: white;
      padding: 16px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;

      &:hover {
        background: #169c64;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      &.secondary {
        background: #f5f5f5;
        color: #333;

        &:hover {
          background: #e0e0e0;
        }
      }
    }
  }
}
</style>
