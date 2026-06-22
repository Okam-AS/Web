<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="success-message">
            <div class="success-content">
              <p>{{ copy.completed }}</p>
              <p class="sub-text">{{ copy.subText }}</p>

              <div class="action-buttons">
                <a
                  href="https://admin.okam.no"
                  target="_blank"
                  class="cta-link"
                >
                  {{ copy.goToAdmin }}
                </a>
                <a
                  href="https://okam.no/last-ned"
                  class="cta-link secondary"
                >
                  {{ copy.downloadApp }}
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
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";
import { isCh } from "~/config/edition";

export default {
  components: { PageHeader, PageFooter },
  computed: {
    copy() {
      return isCh
        ? {
            completed: "Die Registrierung ist abgeschlossen!",
            subText: "Sie können Ihre Speisekarte jetzt auf admin.okam.no oder in der Okam Admin-App erfassen",
            goToAdmin: "Zu admin.okam.no",
            downloadApp: "Okam Admin-App herunterladen",
          }
        : {
            completed: "Registreringen er fullført!",
            subText: "Du kan nå legge inn menyen din på admin.okam.no eller i Okam Admin-appen",
            goToAdmin: "Gå til admin.okam.no",
            downloadApp: "Last ned Okam Admin-appen",
          };
    },
  },
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
