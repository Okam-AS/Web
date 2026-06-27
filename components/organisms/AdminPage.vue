<template>
  <div class="admin" :class="{ 'admin--collapsed': sidebarCollapsed }">
    <AdminPageHeader
      :collapsed="sidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />
    <div class="admin__main">
      <OnboardingNotification v-if="!isOnboardingPage" />
      <main :class="['admin__content', { admin__wrapper: !fullWidth }]">
        <slot />
      </main>
      <AdminPageFooter v-if="!userIsLoggedIn" />
    </div>
    <LoginModal
      v-if="showLogin"
      @close="closeLoginModal"
    />
  </div>
</template>

<script>
import AdminPageHeader from "~/components/organisms/AdminPageHeader.vue";
import AdminPageFooter from "~/components/organisms/AdminPageFooter.vue";
import OnboardingNotification from "~/components/organisms/OnboardingNotification.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  components: {
    AdminPageHeader,
    AdminPageFooter,
    OnboardingNotification,
    LoginModal,
  },
  props: {
    fullWidth: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({
    showLogin: false,
    sidebarCollapsed: false,
  }),
  computed: {
    isOnboardingPage() {
      return this.$route && this.$route.path.includes("/admin/onboarding");
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
  },
  mounted() {
    if (typeof localStorage !== "undefined") {
      this.sidebarCollapsed = localStorage.getItem("adminSidebarCollapsed") === "true";
    }
    this.initAuth();
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("adminSidebarCollapsed", this.sidebarCollapsed);
      }
    },
    async initAuth() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      // Only redirect to /admin if we're on a different admin page
      // This creates the redirect flow for protected pages
      if (this.$route && this.$route.path !== "/admin" && !this.$route.query.redirect) {
        this.$router.replace(`/admin?redirect=${encodeURIComponent(this.$route.fullPath)}`);
      }
    } else {
      await this._userService.Reload();
      const adminIn = this.$store.state.currentUser?.adminIn;
      if (!adminIn || adminIn.length === 0) {
        this.$router.replace("/registrer");
        return;
      }
    }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        // Check if there's a redirect parameter in the URL
        const redirectPath = this.$route.query.redirect;
        if (redirectPath && redirectPath !== this.$route.fullPath) {
          // Navigate to the redirect path and remove the redirect query parameter
          this.$router.replace(redirectPath);
        } else {
          // Emit event to notify parent page to reload data
          this.$emit('login-success');
        }
      }
    },
  },
};
</script>

<style scoped>
.admin__main {
  margin-left: var(--admin-sidebar-width, 264px);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background-color: #f8f9fa;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin--collapsed .admin__main {
  margin-left: 0;
}

@media (max-width: 1024px) {
  .admin__main {
    margin-left: 0;
    padding-top: 56px;
  }
}
</style>
