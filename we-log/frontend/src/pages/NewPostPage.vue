<template>
  <div class="page-container">
    <div class="page-header">
      <h2>发布动态</h2>
      <RouterLink to="/feed" class="button-secondary">返回列表</RouterLink>
    </div>

    <div class="form-row">
      <label class="helper-text">正文内容（最多 800 字）</label>
      <textarea
        v-model="content"
        class="textarea-field"
        maxlength="800"
        placeholder="分享你的停车日记或灵感..."
      ></textarea>
      <div class="helper-text">{{ content.length }}/800</div>
    </div>

    <div class="form-row">
      <label class="helper-text">上传图片（最多 9 张）</label>
      <input type="file" accept="image/*" multiple @change="handleFiles" />
      <div class="preview-list">
        <img v-for="(img, index) in images" :key="index" :src="img" class="preview-item" />
      </div>
      <div class="helper-text">已选择 {{ images.length }} 张</div>
    </div>

    <div class="actions">
      <button class="button-secondary" @click="clear">清空</button>
      <button class="button-primary" @click="submit">发布</button>
    </div>

    <p v-if="message" class="helper-text" style="color: #1d9bf0; margin-top: 12px;">
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { createPost } from "../services/api";

const router = useRouter();
const content = ref("");
const images = ref([]);
const message = ref("");

const handleFiles = async (event) => {
  const files = Array.from(event.target.files || []);
  const combined = [...images.value, ...files];
  const limited = combined.slice(0, 9);
  images.value = await Promise.all(limited.map((file) => toBase64(file)));
};

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const submit = async () => {
  message.value = "";
  if (!content.value.trim()) {
    message.value = "请填写文字内容";
    return;
  }
  const user = localStorage.getItem("we-log-user");
  await createPost({
    user,
    content: content.value.trim(),
    images: images.value,
  });
  message.value = "发布成功，即将返回列表";
  setTimeout(() => {
    router.push("/feed");
  }, 800);
};

const clear = () => {
  content.value = "";
  images.value = [];
  message.value = "";
};
</script>
