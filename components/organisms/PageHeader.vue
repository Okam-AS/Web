<template>
  <div>
    <header
      class="header"
      :class="{ 'is-scrolled': isScrolled }"
    >
      <div class="container header__container">
        <!-- Logo -->
        <a
          href="/"
          class="header__logo"
        >
          <img
            src="~/assets/UI/logo.svg"
            alt="Logo"
            width="120"
          />
        </a>

        <!-- Desktop Navigation -->
        <nav class="header__nav desktop-nav">
          <ul class="desktop-nav__list">
            <li
              v-for="link in links"
              :key="link.href"
            >
              <a
                :href="link.href"
                class="desktop-nav__link"
                >{{ link.title }}</a
              >
            </li>
          </ul>
        </nav>

        <!-- CTA Buttons -->
        <div class="header__cta">
          <a
            :href="startNowHref"
            class="btn btn--outline"
            >{{ startNowLabel }}</a
          >
          <a
            href="https://shop.okam.no"
            class="btn btn--blue"
            >Bestill mat</a
          >
        </div>

        <!-- Mobile Menu Button -->
        <button
          class="header__menu-btn"
          :aria-expanded="isMenuOpen"
          @click="toggleMenu"
        >
          <span class="sr-only">Meny</span>
          <span class="hamburger" />
        </button>

        <!-- Mobile Navigation -->
        <div
          class="mobile-nav"
          :class="{ 'is-open': isMenuOpen }"
        >
          <nav class="mobile-nav__content">
            <button
              class="mobile-nav__close"
              aria-label="Lukk meny"
              @click="closeMenu"
            >
              <span class="close-icon" />
            </button>
            <ul class="mobile-nav__list">
              <li
                v-for="link in links"
                :key="link.href"
              >
                <a
                  :href="link.href"
                  class="mobile-nav__link"
                  @click="closeMenu"
                >
                  {{ link.title }}
                </a>
              </li>
            </ul>
            <div class="mobile-nav__cta">
              <a
                :href="startNowHref"
                class="btn btn--outline btn--full"
                >{{ startNowLabel }}</a
              >
              <a
                href="https://shop.okam.no"
                class="btn btn--blue btn--full"
                >Bestill mat</a
              >
            </div>
          </nav>
        </div>
      </div>
    </header>
  </div>
</template>

<script>
export default {
  data: () => ({
    isMenuOpen: false,
    isScrolled: false,
    links: [
      { href: "/om-oss", title: "Om oss" },
      { href: "/wolt", title: "Wolt" },
      { href: "/priser", title: "Priser" },
      { href: "/kontakt", title: "Kontakt" },
    ],
  }),

  computed: {
    startNowHref() {
      return this.$store.getters.userIsLoggedIn ? "/admin" : "/registrer";
    },
    startNowLabel() {
      return this.$store.getters.userIsLoggedIn ? "Gå til admin" : "Sett opp din restaurant";
    },
  },

  mounted() {
    window.addEventListener("scroll", this.handleScroll);
  },

  beforeDestroy() {
    window.removeEventListener("scroll", this.handleScroll);
  },

  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      document.body.style.overflow = this.isMenuOpen ? "hidden" : "";
    },

    closeMenu() {
      this.isMenuOpen = false;
      document.body.style.overflow = "";
    },

    handleScroll() {
      this.isScrolled = window.scrollY > 50;
    },
  },
};
</script>

<style lang="scss">
.announcement-banner {
  background: #003058;
  padding: 0.75rem;
  text-align: center;

  &__link {
    color: white;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

.header {
  position: sticky;
  top: 0;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s ease;
  z-index: 100;

  &__container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  &__logo {
    flex-shrink: 0;
  }
}

.desktop-nav {
  display: none;
  margin: 0 2rem;

  &__list {
    display: flex;
    gap: 2rem;
    list-style: none;
  }

  &__link {
    color: #333;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: #1bb776;
    }
  }
}

.header__cta {
  display: none;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;

  &--primary {
    background: #1bb776;
    color: white;

    &:hover {
      background: darken(#1bb776, 5%);
    }
  }

  &--outline {
    border: 2px solid #1bb776;
    color: #1bb776;

    &:hover {
      background: #1bb776;
      color: white;
    }
  }

  &--blue {
    border: 2px solid #003058;
    color: rgb(0, 48, 88);
    cursor: pointer;

    &:hover {
      background: #003058;
      color: white;
    }
  }

  &--full {
    width: 100%;
    text-align: center;
  }
}

.mobile-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  padding: 2rem;
  transform: translateX(100%);
  transition: transform 0.3s ease;

  &.is-open {
    transform: translateX(0);
  }

  &__list {
    list-style: none;
    margin: 2rem 0;
  }

  &__link {
    display: block;
    padding: 1rem 0;
    color: #333;
    text-decoration: none;
    font-size: 1.2rem;
    border-bottom: 1px solid #eee;
  }

  &__cta {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem;
  }

  &__close {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
    padding: 1rem;
    margin: -1rem;
    border: none;
    background: none;
    cursor: pointer;
  }
}

.close-icon {
  display: block;
  width: 20px;
  height: 20px;
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    background: #333;
    left: 0;
    top: 50%;
  }

  &::before {
    transform: rotate(45deg);
  }

  &::after {
    transform: rotate(-45deg);
  }
}

.hamburger {
  display: block;
  width: 20px;
  height: 2px;
  background: #333;
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 20px;
    height: 2px;
    background: #333;
    left: 0;
  }

  &::before {
    top: -6px;
  }
  &::after {
    bottom: -6px;
  }
}

@media (min-width: 1000px) {
  .header__menu-btn {
    display: none;
  }

  .desktop-nav,
  .header__cta {
    display: flex;
  }

  .mobile-nav {
    display: none;
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.header__menu-btn {
  padding: 1rem;
  border: none;
  background: none;
  cursor: pointer;
  margin: -1rem;
}
</style>
