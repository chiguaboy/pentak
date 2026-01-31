<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="month-filter">
        <input v-model="month" type="month" class="input-field" />
      </div>
    </Teleport>
    <div class="page-header">

      <!-- <RouterLink to="/new" class="button-primary">发帖</RouterLink> -->
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else-if="posts.length === 0" class="card-subtitle">暂无动态，快去发布第一条吧。</div>
    <div v-else>
      <div
        v-for="post in posts"
        :key="post.id"
        class="card"
        :class="post.images?.length ? 'card--with-images' : 'card--no-images'"
      >
        <div class="card-header">
          <div class="card-meta">
            <div class="card-title">{{ post.user }}</div>
            <div class="card-subtitle">{{ post.createdAt }}</div>
          </div>
          <div class="card-actions">
            <RouterLink :to="`/detail/${post.id}`" class="link-button">查看</RouterLink>
            <RouterLink :to="`/edit/${post.id}`" class="link-button">编辑</RouterLink>
          </div>
        </div>
        <div class="card-content">{{ post.content }}</div>
        <div v-if="post.images?.length" class="image-grid">
          <img
            v-for="(img, index) in post.images.slice(0, 3)"
            :key="index"
            :src="img"
            alt="图片"
            @click="openPreview(img)"
          />
        </div>
      </div>
    </div>
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <img :src="previewImage" alt="预览图片" class="image-preview" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { fetchPosts } from "../services/api";

const user = localStorage.getItem("we-log-user");
const posts = ref([]);
const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const month = ref(defaultMonth);
const loading = ref(false);
const previewImage = ref("");

const loadPosts = async () => {
  loading.value = true;
  try {
    posts.value = await fetchPosts(month.value || undefined);
  } finally {
    loading.value = false;
  }
};

onMounted(loadPosts);

watch(month, () => {
  loadPosts();
});

const openPreview = (img) => {
  previewImage.value = img;
};

const closePreview = () => {
  previewImage.value = "";
};
</script>
