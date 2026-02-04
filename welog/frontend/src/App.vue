<template>
  <div class="app-shell">
    <header v-if="showNav" class="top-bar">
      <div class="top-bar-content">
        <div id="top-bar-slot"></div>
        <div class="top-bar-actions">
          <button class="home-button" type="button" @click="router.replace('/board')">
          入场
          </button>
          <button class="home-button" type="button" @click="router.replace('/feed')">
            缴费
          </button>

          <button class="theme-toggle" type="button" @click="toggleTheme">
            {{ themeLabel }}
          </button>
                    <button class="home-button" type="button" @click="router.replace('/login')">
            查询
          </button>
        </div>
      </div>
    </header>
    <main class="main-content" :class="{ 'no-scroll': isLogin, 'no-x-scroll': isDetail }">
      <RouterView />
    </main>
     <!-- <RouterLink v-if="showFab" to="/new" class="fab">+</RouterLink> -->
    <RouterLink v-if="showFab" to="/new" class="fab"><span style="margin-bottom: 8px;">+</span></RouterLink>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const isLogin = computed(() => route.path === "/login");
const isDetail = computed(() => route.path.startsWith("/detail/"));
const showNav = computed(() => !isLogin.value);
const showFab = computed(() => route.path === "/feed");
const themeStorageKey = "welog-theme";
const theme = ref(localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light");
const themeLabel = computed(() => (theme.value === "light" ? "灯光" : "灯光"));
const logoutFlagKey = "welog-logout-pending";
const lastRouteKey = "welog-last-route";
const visibilityThrottleMs = 300;
let lastVisibilityAt = 0;
let lastVisibilityState = "";

const applyTheme = (value) => {
  document.documentElement.setAttribute("data-theme", value);
  localStorage.setItem(themeStorageKey, value);
};

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  applyTheme(theme.value);
};

const clearSession = () => {
  sessionStorage.removeItem("welog-user");
  localStorage.removeItem("welog-user");
};

const shouldRunVisibility = (state) => {
  const now = Date.now();
  if (lastVisibilityState === state && now - lastVisibilityAt < visibilityThrottleMs) {
    return false;
  }
  lastVisibilityState = state;
  lastVisibilityAt = now;
  return true;
};

const handleVisibility = (forceHidden) => {
  const isHidden = forceHidden === true || document.hidden;
  const state = isHidden ? "hidden" : "visible";
  if (!shouldRunVisibility(state)) {
    return;
  }
  if (isHidden) {
    if (localStorage.getItem("welog-user") && route.path !== "/login") {
      sessionStorage.setItem(lastRouteKey, route.fullPath);
    }
    clearSession();
    sessionStorage.setItem(logoutFlagKey, "1");
    return;
  }
  const shouldLogout = sessionStorage.getItem(logoutFlagKey) === "1";
  if (shouldLogout) {
    sessionStorage.removeItem(logoutFlagKey);
  }
  if (shouldLogout && route.path !== "/login") {
    router.replace("/login");
  }
};

const handlePageHide = () => {
  handleVisibility(true);
};

const handlePageShow = () => {
  handleVisibility(false);
};

onMounted(() => {
  applyTheme(theme.value);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibility);
  window.removeEventListener("pagehide", handlePageHide);
  window.removeEventListener("pageshow", handlePageShow);
});
</script>
