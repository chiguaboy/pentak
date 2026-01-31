<template>
  <div class="app-shell">
    <header v-if="showNav" class="top-bar">
      <div id="top-bar-slot"></div>
    </header>
    <main class="main-content" :class="{ 'no-scroll': isLogin, 'no-x-scroll': isDetail }">
      <RouterView />
    </main>
    <RouterLink v-if="showFab" to="/new" class="fab">+</RouterLink>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const isLogin = computed(() => route.path === "/login");
const isDetail = computed(() => route.path.startsWith("/detail/"));
const showNav = computed(() => !isLogin.value);
const showFab = computed(() => !isLogin.value && !isDetail.value && !route.path.startsWith("/edit/"));

const handleVisibility = () => {
  if (document.hidden) {
    localStorage.removeItem("we-log-user");
    router.push("/login");
  }
};

const logout = () => {
  localStorage.removeItem("we-log-user");
  router.push("/login");
};

onMounted(() => {
  document.addEventListener("visibilitychange", handleVisibility);
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibility);
});
</script>
