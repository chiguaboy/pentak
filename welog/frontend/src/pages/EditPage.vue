<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="top-bar-left">
        <RouterLink to="/feed" class="top-bar-button">返回</RouterLink>
      </div>
    </Teleport>
    <div class="page-header">
      <div class="page-title">编辑动态</div>
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
            <img
              :src="getImageThumb(img)"
              class="preview-item"
              @click="openPreview(getImageUrl(img))"
            />
            <button type="button" class="preview-remove" @click="removeImage(index)">-</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="button-secondary" :disabled="saving || uploading" @click="reset">
          恢复原文
        </button>
        <button class="button-primary" :disabled="saving || uploading" @click="save">
          {{ saving ? "保存中..." : "保存" }}
        </button>
      </div>

      <p v-if="message" class="helper-text" style="color: #1d9bf0; margin-top: 12px;">
        {{ message }}
      </p>
    </div>
    <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
      <div v-if="previewLoading" class="image-preview-loading"></div>
      <img
        :src="previewImage"
        alt="预览图片"
        class="image-preview"
        :class="{ 'is-loading': previewLoading }"
        @load="handlePreviewLoaded"
        @error="handlePreviewLoaded"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchPost, updatePost, uploadImage } from "../services/api";
import { resolveImageSrc } from "../utils/image";

const route = useRoute();
const router = useRouter();
const monthStorageKey = "welog-month";
const normalizeMonth = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})$/);
  if (!match) {
    return "";
  }
  const monthNumber = Number(match[2]);
  if (!monthNumber || monthNumber < 1 || monthNumber > 12) {
    return "";
  }
  return `${match[1]}-${String(monthNumber).padStart(2, "0")}`;
};
const getBeijingMonth = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const monthValue = parts.find((part) => part.type === "month")?.value;
  const formatted = normalizeMonth(`${year}-${monthValue}`);
  if (formatted) {
    return formatted;
  }
  const fallback = new Date();
  return normalizeMonth(`${fallback.getFullYear()}-${fallback.getMonth() + 1}`);
};
const month = ref(
  normalizeMonth(route.query.month)
  || normalizeMonth(localStorage.getItem(monthStorageKey))
  || getBeijingMonth(),
);
const loading = ref(false);
const content = ref("");
const images = ref([]);
const original = ref({ content: "", images: [] });
const message = ref("");
const saving = ref(false);
const uploading = ref(false);
const previewImage = ref("");
const previewLoading = ref(false);

const handleFiles = async (event) => {
  if (uploading.value) {
    return;
  }
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }
  uploading.value = true;
  try {
    const remainingSlots = Math.max(0, 9 - images.value.length);
    const selectedFiles = files.slice(0, remainingSlots);
    const uploaded = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await toBase64(file);
        return uploadImage(base64);
      }),
    );
    images.value = [...images.value, ...uploaded].slice(0, 9);
  } finally {
    uploading.value = false;
    event.target.value = "";
  }
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
    const data = await fetchPost(route.params.id, month.value);
    original.value = { content: data.content, images: data.images || [] };
    content.value = data.content;
    images.value = data.images || [];
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  if (saving.value || uploading.value) {
    return;
  }
  content.value = original.value.content;
  images.value = original.value.images;
  message.value = "";
};

const save = async () => {
  if (saving.value || uploading.value) {
    return;
  }
  saving.value = true;
  try {
    await updatePost(route.params.id, {
      content: content.value.trim(),
      images: images.value,
    }, month.value);
    message.value = "保存成功";
    setTimeout(() => {
      router.push({ path: `/detail/${route.params.id}`, query: { month: month.value } });
    }, 800);
  } finally {
    saving.value = false;
  }
};

onMounted(loadPost);

const openPreview = (img) => {
  previewImage.value = img;
  previewLoading.value = true;
};

const closePreview = () => {
  previewImage.value = "";
  previewLoading.value = false;
};

const handlePreviewLoaded = () => {
  previewLoading.value = false;
};

const removeImage = (index) => {
  images.value = images.value.filter((_, currentIndex) => currentIndex !== index);
};

const getImageThumb = (image) => {
  if (typeof image === "string") {
    return resolveImageSrc(image);
  }
  return resolveImageSrc(image?.thumbUrl || image?.url || "");
};

const getImageUrl = (image) => {
  if (typeof image === "string") {
    return resolveImageSrc(image);
  }
  return resolveImageSrc(image?.url || image?.thumbUrl || "");
};
</script>
