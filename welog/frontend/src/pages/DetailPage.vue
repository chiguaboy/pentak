<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="top-bar-left">
        <RouterLink to="/feed" class="top-bar-button">返回</RouterLink>
        <RouterLink
          :to="{ path: `/edit/${post?.id}`, query: { month } }"
          class="top-bar-button primary"
        >
          编辑
        </RouterLink>
      </div>
    </Teleport>
    <div class="page-header">
      <!-- <div>
        <div class="page-title">动态详情</div>
        <p class="card-subtitle">查看完整图文内容</p>
      </div> -->
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else-if="!post" class="card-subtitle">内容不存在</div>
    <div v-else>
      <div class="card-title">{{ post.user }}</div>
      <div class="card-subtitle">{{ post.createdAt }}</div>
      <p class="detail-content">{{ post.content }}</p>
      <div v-if="post.images?.length" class="image-grid">
        <img
          v-for="(img, index) in post.images"
          :key="index"
          :src="getImageUrl(img)"
          alt="图片"
          @click="openPreview(getImageUrl(img))"
        />
      </div>
      <div class="detail-comments">
        <div class="detail-comments-title">评论</div>
        <div v-if="normalizedComments.length === 0" class="card-subtitle">暂无评论</div>
        <div v-else class="detail-comment-list">
          <div v-for="comment in normalizedComments" :key="comment.id" class="detail-comment">
            <div class="detail-comment-meta">
              <span class="detail-comment-user">{{ comment.user }}</span>
              <span v-if="comment.createdAt" class="detail-comment-time">{{ comment.createdAt }}</span>
            </div>
            <p class="detail-comment-content">{{ formatCommentText(comment.content) }}</p>
          </div>
        </div>
        <div class="detail-comment-form">
          <textarea
            v-model="commentInput"
            class="textarea-field"
            maxlength="100"
            placeholder="写下你的评论（最多 100 字）"
          ></textarea>
          <div class="detail-comment-actions">
            <span class="helper-text">{{ commentInput.length }}/100</span>
            <button class="button-primary" type="button" :disabled="commentLoading" @click="submitComment">
              {{ commentLoading ? "发布中..." : "发布评论" }}
            </button>
          </div>
          <p v-if="commentMessage" class="helper-text" style="color: var(--color-accent);">
            {{ commentMessage }}
          </p>
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
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { fetchPost, updatePost } from "../services/api";
import { resolveImageSrc } from "../utils/image";

const route = useRoute();
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
const post = ref(null);
const loading = ref(false);
const previewImage = ref("");
const previewLoading = ref(false);
const commentInput = ref("");
const commentLoading = ref(false);
const commentMessage = ref("");

const loadPost = async () => {
  loading.value = true;
  try {
    post.value = await fetchPost(route.params.id, month.value);
  } finally {
    loading.value = false;
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

const normalizeComments = (comments = []) => {
  if (!Array.isArray(comments)) {
    return [];
  }
  return comments
    .map((comment, index) => {
      if (typeof comment === "string") {
        return {
          id: `comment-${index}`,
          user: "匿名用户",
          content: comment,
          createdAt: "",
        };
      }
      return {
        id: comment?.id ?? `comment-${index}`,
        user: comment?.user ?? comment?.author ?? "匿名用户",
        content: comment?.content ?? comment?.text ?? "",
        createdAt: comment?.createdAt ?? "",
      };
    })
    .filter((comment) => comment.content);
};

const normalizedComments = computed(() => normalizeComments(post.value?.comments));

const formatBeijingTime = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

const formatCommentText = (text) => {
  const value = String(text || "").trim();
  if (value.length <= 100) {
    return value;
  }
  return `${value.slice(0, 100)}...`;
};

const getImageUrl = (image) => {
  if (typeof image === "string") {
    return resolveImageSrc(image);
  }
  return resolveImageSrc(image?.url || image?.thumbUrl || "");
};

const submitComment = async () => {
  commentMessage.value = "";
  const content = commentInput.value.trim().slice(0, 100);
  if (!content) {
    commentMessage.value = "请输入评论内容";
    return;
  }
  if (!post.value) {
    return;
  }
  commentLoading.value = true;
  try {
    const user = localStorage.getItem("welog-user") || "匿名用户";
    const createdAt = formatBeijingTime();
    const newComment = {
      id: `comment-${Date.now()}`,
      user,
      content,
      createdAt,
    };
    const updatedComments = [...normalizedComments.value, newComment];
    const updated = await updatePost(post.value.id, { comments: updatedComments }, month.value);
    post.value = { ...post.value, comments: updated.comments ?? updatedComments };
    commentInput.value = "";
    commentMessage.value = "评论成功";
  } finally {
    commentLoading.value = false;
  }
};
</script>
