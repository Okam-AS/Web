<template>
  <div class="admin">
    <AdminPageHeader />
    <OnboardingNotification v-if="!isOnboardingPage" />
    <main :class="['admin__content', { admin__wrapper: !fullWidth }]">
      <slot />
    </main>
    <AdminPageFooter />
  </div>
</template>

<script>
import AdminPageHeader from "~/components/organisms/AdminPageHeader.vue";
import AdminPageFooter from "~/components/organisms/AdminPageFooter.vue";
import OnboardingNotification from "~/components/organisms/OnboardingNotification.vue";

export default {
  components: {
    AdminPageHeader,
    AdminPageFooter,
    OnboardingNotification,
  },
  props: {
    fullWidth: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isOnboardingPage() {
      return this.$route && this.$route.path.includes("/admin/onboarding");
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      if (this.$route && this.$route.path !== "/admin") {
        // Redirect to admin with the current path as a redirect parameter
        this.$router.push(`/admin?redirect=${encodeURIComponent(this.$route.fullPath)}`);
      }
    } else {
      this._userService.Reload();
    }
  },
};
</script>
