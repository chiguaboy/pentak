<template>
  <div class="page-container">
    <Teleport to="#top-bar-slot">
      <div class="month-filter">
        <input v-model="month" type="month" class="input-field" />
      </div>
    </Teleport>
    <div class="page-header">
      <!-- <div class="page-title">留言板</div> -->
    </div>

    <div class="form-row" style="padding-top: 24px;">
      <!-- <label class="helper-text">留言内容（最多 100 字）</label> -->
      <textarea
        v-model="messageInput"
        class="textarea-field"
        maxlength="100"
        placeholder="写下你的留言..."
      ></textarea>
      <div class="detail-comment-actions">
        <span class="helper-text">{{ messageInput.length }}/100</span>
        <button class="button-primary" type="button" :disabled="submitting" @click="submitMessage">
          {{ submitting ? "发布中..." : "发布留言" }}
        </button>
      </div>
      <p v-if="statusMessage" class="helper-text" style="color: var(--color-accent);">
        {{ statusMessage }}
      </p>
    </div>

    <div v-if="loading" class="card-subtitle">加载中...</div>
    <div v-else-if="sortedMessages.length === 0" class="card-subtitle">暂无留言</div>
    <div v-else>
      <div v-for="message in sortedMessages" :key="message.id" class="card">
        <div class="card-header">
          <div class="card-meta">
            <div class="message-meta">
              <span class="message-user">{{ message.user }}</span>
              <span class="message-time">{{ message.createdAt }}</span>
            </div>
          </div>
        </div>
        <div class="card-content">{{ message.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { createMessage, fetchMessages } from "../services/api";

const messages = ref([]);
const loading = ref(false);
const submitting = ref(false);
const statusMessage = ref("");
const messageInput = ref("");
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

if (month.value) {
  localStorage.setItem(monthStorageKey, month.value);
}

const loadMessages = async () => {
  loading.value = true;
  try {
    messages.value = await fetchMessages(month.value || undefined);
  } finally {
    loading.value = false;
  }
};

onMounted(loadMessages);

watch(month, (value) => {
  if (value) {
    localStorage.setItem(monthStorageKey, value);
  } else {
    localStorage.removeItem(monthStorageKey);
  }
  loadMessages();
});

const sortedMessages = computed(() =>
  (messages.value || []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
);

const submitMessage = async () => {
  if (submitting.value) {
    return;
  }
  statusMessage.value = "";
  const content = messageInput.value.trim().slice(0, 100);
  if (!content) {
    statusMessage.value = "请输入留言内容";
    return;
  }
  submitting.value = true;
  try {
    const user = localStorage.getItem("welog-user") || "匿名用户";
    await createMessage({ user, content }, month.value);
    messageInput.value = "";
    statusMessage.value = "发布成功";
    await loadMessages();
  } finally {
    submitting.value = false;
  }
};
</script>
