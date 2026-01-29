<template>
  <div class="app-shell">
    <aside v-if="showNav" class="side-nav">
      <div class="logo">we-log</div>
      <nav>
        <RouterLink to="/feed" class="nav-link">主页</RouterLink>
        <RouterLink to="/new" class="nav-link">发新动态</RouterLink>
      </nav>
      <button class="nav-link logout" @click="logout">退出</button>
    </aside>
    <main class="main-content">
      <RouterView />
    </main>
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
