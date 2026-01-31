<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="month-filter">
        <input v-model="month" type="month" class="input-field" />
        <button class="button-secondary" @click="loadPosts">筛选</button>
        <button class="link-button" @click="resetMonth">清除</button>
      </div>
    </Teleport>
    <div class="page-header">
      <div>
        <div class="page-title">动态</div>
        <p class="card-subtitle">欢迎回来，{{ user }}</p>
      </div>
      <RouterLink to="/new" class="button-primary">发帖</RouterLink>
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else-if="posts.length === 0" class="card-subtitle">暂无动态，快去发布第一条吧。</div>
    <div v-else>
      <div v-for="post in posts" :key="post.id" class="card">
        <div class="page-header" style="margin-bottom: 8px;">
          <div>
            <div class="card-title">{{ post.user }}</div>
            <div class="card-subtitle">{{ post.createdAt }}</div>
          </div>
          <div>
            <RouterLink :to="`/detail/${post.id}`" class="link-button">查看</RouterLink>
            <RouterLink :to="`/edit/${post.id}`" class="link-button">编辑</RouterLink>
          </div>
        </div>
        <div>{{ post.content }}</div>
        <div v-if="post.images?.length" class="image-grid">
          <img v-for="(img, index) in post.images" :key="index" :src="img" alt="图片" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { fetchPosts } from "../services/api";

const user = localStorage.getItem("we-log-user");
const posts = ref([]);
const month = ref("");
const loading = ref(false);

const loadPosts = async () => {
  loading.value = true;
  try {
    posts.value = await fetchPosts(month.value || undefined);
  } finally {
    loading.value = false;
  }
};

const resetMonth = () => {
  month.value = "";
  loadPosts();
};

onMounted(loadPosts);
</script>
