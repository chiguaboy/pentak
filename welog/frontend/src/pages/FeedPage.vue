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
        :class="[
          post.images?.length ? 'card--with-images' : 'card--no-images',
          hasComments(post.comments) ? 'card--with-comments' : '',
        ]"
      >
        <div class="card-header">
          <div class="card-meta">
            <div class="card-title">{{ post.user }}</div>
            <div class="card-subtitle">{{ post.createdAt }}</div>
          </div>
          <div class="card-actions">
                        <RouterLink
              :to="{ path: `/edit/${post.id}`, query: { month } }"
              class="link-button"
            >
              编辑
            </RouterLink>
            <RouterLink
              :to="{ path: `/detail/${post.id}`, query: { month } }"
              class="link-button"
            >
              查看
            </RouterLink>
          </div>
        </div>
        <div class="card-content">{{ post.content }}</div>
        <div v-if="post.images?.length" class="image-grid">
          <img
            v-for="(img, index) in post.images.slice(0, 3)"
            :key="index"
            :src="getImageThumb(img)"
            alt="图片"
            @click="openPreview(getImageUrl(img))"
          />
        </div>
        <div v-if="hasComments(post.comments)" class="card-comments">
          <div
            v-for="(comment, index) in getLatestComments(post.comments)"
            :key="comment.id || `${post.id}-comment-${index}`"
            class="card-comment"
          >
            <span class="card-comment-user">{{ `@${comment.user}` }}</span>
            <span class="card-comment-separator">:</span>
            <span class="card-comment-content">{{ formatCommentText(comment.content) }}</span>
          </div>
        </div>
      </div>
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
import { onMounted, ref, watch } from "vue";
import { fetchPosts } from "../services/api";
import { resolveImageSrc } from "../helpers/image";

const user = localStorage.getItem("welog-user");
const posts = ref([]);
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
const loading = ref(false);
const previewImage = ref("");
const previewLoading = ref(false);

if (month.value) {
  localStorage.setItem(monthStorageKey, month.value);
}

const loadPosts = async () => {
  loading.value = true;
  try {
    posts.value = await fetchPosts(month.value || undefined);
  } finally {
    loading.value = false;
  }
};

onMounted(loadPosts);

watch(month, (value) => {
  if (value) {
    localStorage.setItem(monthStorageKey, value);
  } else {
    localStorage.removeItem(monthStorageKey);
  }
  loadPosts();
});

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

const normalizeComments = (comments = []) => {
  if (!Array.isArray(comments)) {
    return [];
  }
  return comments.map((comment, index) => {
    if (typeof comment === "string") {
      return {
        id: `comment-${index}`,
        user: "匿名用户",
        content: comment,
        createdAt: "",
      };
    }
    const content = comment?.content ?? comment?.text ?? comment?.comment ?? "";
    const userName = comment?.user ?? comment?.author ?? comment?.username ?? "匿名用户";
    const createdAt = comment?.createdAt ?? comment?.time ?? comment?.date ?? "";
    return {
      id: comment?.id ?? `${userName}-${index}`,
      user: userName,
      content,
      createdAt,
    };
  }).filter((comment) => comment.content);
};

const toTimestamp = (value) => {
  if (!value) {
    return Number.NaN;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const getLatestComments = (comments = []) => {
  const normalized = normalizeComments(comments);
  if (normalized.length <= 2) {
    return normalized;
  }
  const withTimestamp = normalized.map((comment, index) => ({
    ...comment,
    timestamp: toTimestamp(comment.createdAt),
    index,
  }));
  const hasTimestamp = withTimestamp.some((comment) => Number.isFinite(comment.timestamp));
  if (hasTimestamp) {
    return withTimestamp
      .sort((a, b) => {
        if (Number.isFinite(a.timestamp) && Number.isFinite(b.timestamp)) {
          return b.timestamp - a.timestamp;
        }
        if (Number.isFinite(a.timestamp)) {
          return -1;
        }
        if (Number.isFinite(b.timestamp)) {
          return 1;
        }
        return b.index - a.index;
      })
      .slice(0, 2)
      .map(({ timestamp, index, ...rest }) => rest);
  }
  return normalized.slice(-2).reverse();
};

const hasComments = (comments = []) => getLatestComments(comments).length > 0;

const formatCommentText = (text) => {
  const value = String(text || "").trim();
  if (value.length <= 100) {
    return value;
  }
  return `${value.slice(0, 100)}...`;
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
