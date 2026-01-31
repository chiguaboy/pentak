<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">编辑动态</div>
      <RouterLink to="/feed" class="button-secondary">返回</RouterLink>
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else>
      <div class="form-row">
        <label class="helper-text">正文内容（最多 800 字）</label>
        <textarea
          v-model="content"
          class="textarea-field"
          maxlength="800"
        ></textarea>
        <div class="helper-text">{{ content.length }}/800</div>
      </div>

      <div class="form-row">
        <label class="helper-text">替换图片（最多 9 张）</label>
        <input type="file" accept="image/*" multiple class="file-input" @change="handleFiles" />
        <div class="preview-list">
          <div v-for="(img, index) in images" :key="index" class="preview-wrap">
            <img :src="img" class="preview-item" @click="openPreview(img)" />
            <button type="button" class="preview-remove" @click="removeImage(index)">-</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="button-secondary" @click="reset">恢复原文</button>
        <button class="button-primary" @click="save">保存</button>
      </div>

      <p v-if="message" class="helper-text" style="color: #1d9bf0; margin-top: 12px;">
        {{ message }}
      </p>
    </div>
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <img :src="previewImage" alt="预览图片" class="image-preview" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchPost, updatePost } from "../services/api";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const content = ref("");
const images = ref([]);
const original = ref({ content: "", images: [] });
const message = ref("");
const previewImage = ref("");

const handleFiles = async (event) => {
  const files = Array.from(event.target.files || []);
  const encoded = await Promise.all(files.map((file) => toBase64(file)));
  images.value = [...images.value, ...encoded].slice(0, 9);
  event.target.value = "";
};

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const loadPost = async () => {
  loading.value = true;
  try {
    const data = await fetchPost(route.params.id);
    original.value = { content: data.content, images: data.images || [] };
    content.value = data.content;
    images.value = data.images || [];
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  content.value = original.value.content;
  images.value = original.value.images;
  message.value = "";
};

const save = async () => {
  await updatePost(route.params.id, {
    content: content.value.trim(),
    images: images.value,
  });
  message.value = "保存成功";
  setTimeout(() => {
    router.push(`/detail/${route.params.id}`);
  }, 800);
};

onMounted(loadPost);

const openPreview = (img) => {
  previewImage.value = img;
};

const closePreview = () => {
  previewImage.value = "";
};

const removeImage = (index) => {
  images.value = images.value.filter((_, currentIndex) => currentIndex !== index);
};
</script>
