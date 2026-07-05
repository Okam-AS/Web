<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="success-message">
            <div class="success-content">
              <p>{{ $i('registerComplete_completed') }}</p>
              <p class="sub-text">{{ $i('registerComplete_subText', { adminHost }) }}</p>

              <div class="action-buttons">
                <a
                  :href="adminUrl"
                  target="_blank"
                  class="cta-link"
                >
                  {{ $i('registerComplete_goToAdmin', { adminHost }) }}
                </a>
                <a
                  :href="downloadUrl"
                  class="cta-link secondary"
                >
                  {{ $i('registerComplete_downloadApp') }}
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

export default {
  components: { PageHeader, PageFooter },
  computed: {
    // Domain/URLs are market-driven (not language-driven), derived from
    // marketConfig.hostname so they stay correct regardless of which
    // adminLocale the user has chosen for the surrounding $i() text below.
    adminHost() {
      return this.marketConfig.hostname.replace("https://", "admin.");
    },
    adminUrl() {
      return `https://${this.adminHost}`;
    },
    downloadUrl() {
      return `${this.marketConfig.hostname}/last-ned`;
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
