<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2>动态详情</h2>
        <p class="card-subtitle">查看完整图文内容</p>
      </div>
      <div>
        <RouterLink to="/feed" class="button-secondary">返回列表</RouterLink>
        <RouterLink :to="`/edit/${post?.id}`" class="button-primary">编辑</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else-if="!post" class="card-subtitle">内容不存在</div>
    <div v-else>
      <div class="card-title">{{ post.user }}</div>
      <div class="card-subtitle">{{ post.createdAt }}</div>
      <p style="margin-top: 16px;">{{ post.content }}</p>
      <div v-if="post.images?.length" class="image-grid">
        <img v-for="(img, index) in post.images" :key="index" :src="img" alt="图片" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { fetchPost } from "../services/api";

const route = useRoute();
const post = ref(null);
const loading = ref(false);

const loadPost = async () => {
  loading.value = true;
  try {
    post.value = await fetchPost(route.params.id);
  } finally {
    loading.value = false;
  }
};

onMounted(loadPost);
</script>
