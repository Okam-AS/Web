<template>
  <div class="admin">
    <AdminPageHeader />
    <OnboardingNotification v-if="!isOnboardingPage" />
    <main :class="['admin__content', { admin__wrapper: !fullWidth }]">
      <slot />
    </main>
    <AdminPageFooter />
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
  }),
  computed: {
    isOnboardingPage() {
      return this.$route && this.$route.path.includes("/admin/onboarding");
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      // Only redirect to /admin if we're on a different admin page
      // This creates the redirect flow for protected pages
      if (this.$route && this.$route.path !== "/admin" && !this.$route.query.redirect) {
        this.$router.replace(`/admin?redirect=${encodeURIComponent(this.$route.fullPath)}`);
      }
    } else {
      this._userService.Reload();
    }
  },
  methods: {
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
