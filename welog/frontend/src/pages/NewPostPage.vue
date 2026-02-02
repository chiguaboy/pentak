<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="top-bar-left">
        <RouterLink to="/feed" class="top-bar-button">返回</RouterLink>
      </div>
    </Teleport>
    <div class="page-header">
      <div class="page-title">发布动态</div>
    </div>

    <div class="form-row">
      <label class="helper-text">正文内容（最多 800 字）</label>
      <textarea
        v-model="content"
        class="textarea-field"
        maxlength="800"
        placeholder="思念变成海..."
      ></textarea>
      <div class="helper-text">{{ content.length }}/800</div>
    </div>

    <div class="form-row">
      <!-- <label class="helper-text">上传图片（最多 9 张）</label> -->
      <input type="file" accept="image/*" multiple class="file-input" @change="handleFiles" />
      <div class="preview-list">
        <div v-for="(img, index) in images" :key="index" class="preview-wrap">
          <img :src="getImageThumb(img)" class="preview-item" @click="openPreview(img)" />
          <button type="button" class="preview-remove" @click="removeImage(index)">-</button>
        </div>
      </div>
      <div class="helper-text">已选择 {{ images.length }} 张</div>
    </div>

    <div class="actions">
      <button class="button-secondary" :disabled="submitting || uploading" @click="clear">清空</button>
      <button class="button-primary" :disabled="submitting || uploading" @click="submit">
        {{ submitting ? "发布中..." : "发布动态" }}
      </button>
    </div>

    <p v-if="message" class="helper-text" style="color: #1d9bf0; margin-top: 12px;">
      {{ message }}
    </p>
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
import { ref } from "vue";
import { useRouter } from "vue-router";
import { createPost, uploadImage } from "../services/api";
import { resolveImageSrc } from "../helpers/image";

const router = useRouter();
const content = ref("");
const images = ref([]);
const message = ref("");
const submitting = ref(false);
const uploading = ref(false);
const previewImage = ref("");
const previewLoading = ref(false);
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
const storedMonth = normalizeMonth(localStorage.getItem(monthStorageKey));
const month = ref(storedMonth || getBeijingMonth());

const handleFiles = async (event) => {
  if (uploading.value) {
    return;
  }
  message.value = "";
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
        try {
          const base64 = await toBase64(file);
          return await uploadImage(base64);
        } catch (err) {
          message.value = err?.response?.data?.message || "图片格式不支持，请尝试截图重新上传";
          return null;
        }
      }),
    );
    const successful = uploaded.filter(Boolean);
    images.value = [...images.value, ...successful].slice(0, 9);
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

const submit = async () => {
  if (submitting.value || uploading.value) {
    return;
  }
  message.value = "";
  if (!content.value.trim()) {
    message.value = "请填写文字内容";
    return;
  }
  submitting.value = true;
  const user = localStorage.getItem("welog-user");
  try {
    await createPost({
      user,
      content: content.value.trim(),
      images: images.value,
    }, month.value);
    localStorage.setItem(monthStorageKey, month.value);
    message.value = "发布成功，即将返回列表";
    setTimeout(() => {
      router.push("/feed");
    }, 800);
  } finally {
    submitting.value = false;
  }
};

const clear = () => {
  if (submitting.value || uploading.value) {
    return;
  }
  content.value = "";
  images.value = [];
  message.value = "";
};

const removeImage = (index) => {
  if (submitting.value || uploading.value) {
    return;
  }
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

const openPreview = (image) => {
  previewImage.value = getImageUrl(image);
  previewLoading.value = true;
};

const closePreview = () => {
  previewImage.value = "";
  previewLoading.value = false;
};

const handlePreviewLoaded = () => {
  previewLoading.value = false;
};
</script>
