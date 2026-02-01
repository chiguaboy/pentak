<template>
  <div class="app-shell">
    <header v-if="showNav" class="top-bar">
      <div class="top-bar-content">
        <div id="top-bar-slot"></div>
        <div class="top-bar-actions">
          <button class="theme-toggle" type="button" @click="toggleTheme">
            {{ themeLabel }}
          </button>
        </div>
      </div>
    </header>
    <main class="main-content" :class="{ 'no-scroll': isLogin, 'no-x-scroll': isDetail }">
      <RouterView />
    </main>
    <RouterLink v-if="showFab" to="/new" class="fab">+</RouterLink>
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
const showFab = computed(() => !isLogin.value && !isDetail.value && !route.path.startsWith("/edit/"));
const themeStorageKey = "we-log-theme";
const theme = ref(localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light");
const themeLabel = computed(() => (theme.value === "light" ? "暗黑模式" : "浅色模式"));

const applyTheme = (value) => {
  document.documentElement.setAttribute("data-theme", value);
  localStorage.setItem(themeStorageKey, value);
};

const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light";
  applyTheme(theme.value);
};

const handleVisibility = () => {
  if (document.hidden) {
    localStorage.removeItem("we-log-user");
    router.push("/login");
  }
};

onMounted(() => {
  applyTheme(theme.value);
  document.addEventListener("visibilitychange", handleVisibility);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibility);
});
</script>
