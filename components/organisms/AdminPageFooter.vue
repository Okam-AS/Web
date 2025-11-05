<template>
  <footer class="admin__footer">
    <div class="admin__wrapper">
      <div class="logo-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 836.826 175.846"
        >
          <path
            d="M330.7,154.371a14.251,14.251,0,0,1-7.139,18.849,29.732,29.732,0,0,1-33.265-6.11l-65.674-65.843V157a18.613,18.613,0,1,1-37.225,0V23.4a18.613,18.613,0,1,1,37.225,0V79.136L290.14,13.453A29.732,29.732,0,0,1,323.4,7.343a14.253,14.253,0,0,1,4.259,23.036L268.263,90.2l59.56,59.983A14.247,14.247,0,0,1,330.7,154.371ZM169.105,90.04c0,47.261-37.855,85.573-84.552,85.573S0,137.3,0,90.04,37.856,4.467,84.553,4.467,169.105,42.779,169.105,90.04Zm-37.225,0c0-26.453-21.189-47.9-47.327-47.9S37.225,63.587,37.225,90.04s21.19,47.9,47.328,47.9S131.88,116.494,131.88,90.04ZM469.931,19.111A29.388,29.388,0,0,0,442.4,0a12.769,12.769,0,0,1-3.8,0,29.388,29.388,0,0,0-27.532,19.111L361.058,153.09A14.012,14.012,0,0,0,374.184,172a29.147,29.147,0,0,0,27.284-18.894L440.5,49.233l39.032,103.873A29.147,29.147,0,0,0,506.816,172a14.012,14.012,0,0,0,13.126-18.91ZM835.942,153.09,785.931,19.111A29.388,29.388,0,0,0,758.4,0c-.3,0-.6.027-.9.045-.3-.018-.6-.045-.9-.045a29.388,29.388,0,0,0-27.532,19.111L691.5,119.759,653.931,19.111A29.388,29.388,0,0,0,626.4,0c-.472,0-.939.025-1.4.071C624.54.025,624.073,0,623.6,0a29.388,29.388,0,0,0-27.532,19.111L546.058,153.09A14.012,14.012,0,0,0,559.184,172a29.147,29.147,0,0,0,27.284-18.894L625,50.563l38.532,102.543A29.147,29.147,0,0,0,690.816,172c.231,0,.456-.023.684-.035.228.012.453.035.684.035a29.147,29.147,0,0,0,27.284-18.894L757.5,51.894l38.032,101.212A29.147,29.147,0,0,0,822.816,172a14.012,14.012,0,0,0,13.126-18.91Z"
          />
        </svg>
        <span class="admin-badge">Admin</span>
      </div>
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
  padding: 16px 0;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.admin__wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.logo-container svg {
  height: 18px;
  width: auto;
  fill: #6c757d;
}

.admin-badge {
  color: #495057;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 1;
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
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid #dee2e6;
  background-color: white;
}

.dropdown-indicator {
  font-size: 14px;
  margin-left: 2px;
}

.user-info:hover {
  background-color: #f1f3f5;
  border-color: #adb5bd;
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
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
  background-color: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 6px;
  margin-bottom: 8px;
}

.logout-button,
.close-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: white;
  border: none;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  border-radius: 6px;
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
  font-size: 16px;
}

.material-icons.closing-icon {
  font-size: 16px;
  transform: scale(0.9);
}

.close-button:hover {
  background-color: #f1f3f5;
  color: #212529;
}

.logout-button:hover {
  background-color: #fee;
  color: #dc3545;
}

@media (max-width: 768px) {
  .admin__wrapper {
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .logo-container {
    order: 2;
  }

  .user-section {
    order: 1;
  }
}

@media (max-width: 576px) {
  .user-section {
    max-width: 100%;
    width: 100%;
  }

  .user-info,
  .dropdown-menu {
    width: 100%;
  }

  .logo-container svg {
    height: 20px;
  }

  .admin-badge {
    font-size: 0.75rem;
    padding: 3px 10px;
  }
}
</style>
