<template>
  <div class="app-shell">
    <header v-if="showNav" class="top-bar">
      <div class="logo">we-log</div>
      <button class="icon-button" @click="logout">退出</button>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
    <nav v-if="showNav" class="bottom-tab">
      <RouterLink to="/feed" class="tab-item">主页</RouterLink>
      <RouterLink to="/new" class="tab-item">发布</RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const showNav = computed(() => route.path !== "/login");

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
