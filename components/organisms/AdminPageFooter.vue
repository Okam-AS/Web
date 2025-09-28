<template>
  <footer class="admin__footer">
    <div class="admin__wrapper">
      <div
        v-if="userIsLoggedIn"
        class="user-section"
      >
        <div
          v-if="showLogoutButton"
          class="dropdown-menu"
        >
          <button
            class="close-button"
            title="Lukk"
            @click="toggleLogoutButton"
          >
            <span class="material-icons closing-icon">close</span>
            <span>Lukk</span>
          </button>
          <button
            class="logout-button"
            title="Logg ut"
            @click="logout"
          >
            <span class="material-icons logout-icon">logout</span>
            <span>Logg ut</span>
          </button>
        </div>
        <div
          class="user-info"
          @click="toggleLogoutButton"
        >
          <span class="material-icons user-icon">account_circle</span>
          <span class="user-phone">{{ user.phoneNumber }}</span>
          <span class="material-icons dropdown-indicator">{{ showLogoutButton ? "keyboard_arrow_down" : "keyboard_arrow_up" }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  data() {
    return {
      showLogoutButton: false,
    };
  },
  computed: {
    user() {
      return this.$store.state.currentUser;
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
  },
  methods: {
    toggleLogoutButton() {
      this.showLogoutButton = !this.showLogoutButton;
    },
    logout() {
      this._userService.Logout();
      if (window && window.location) {
        window.location.href = "/";
      }
    },
  },
};
</script>

<style scoped>
.admin__footer {
  padding: 12px 0;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.admin__wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
  display: flex;
  justify-content: flex-end;
}

.user-section {
  position: relative;
  display: inline-block;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 3px;
  transition: all 0.2s ease;
  border: 1px solid #dee2e6;
  background-color: #f1f3f5;
}

.dropdown-indicator {
  font-size: 14px;
  margin-left: 2px;
}

.user-info:hover {
  background-color: #e9ecef;
}

.material-icons.user-icon {
  font-size: 16px;
  color: #6c757d;
}

.user-phone {
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: 0;
  right: 0;
  transform: translateY(-100%);
  z-index: 10;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  background-color: #f1f3f5;
  border: 1px solid #dee2e6;
  padding: 4px;
}

.logout-button,
.close-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background-color: #f1f3f5;
  border: none;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  border-radius: 3px;
  margin-bottom: 4px;
}

.close-button {
  margin-bottom: 4px;
  color: #6c757d;
}

.logout-button:last-child {
  margin-bottom: 0;
}

.material-icons.logout-icon {
  font-size: 14px;
}

.material-icons.closing-icon {
  font-size: 14px;
  transform: scale(0.9);
}

.close-button:hover {
  background-color: #e9ecef;
  color: #212529;
}

.logout-button:hover {
  background-color: #e9ecef;
  color: #dc3545;
}

@media (max-width: 576px) {
  .user-section {
    max-width: 100%;
  }

  .user-info,
  .dropdown-menu {
    width: 100%;
  }
}
</style>
