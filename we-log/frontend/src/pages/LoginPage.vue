<template>
  <div class="login-shell">
    <div class="login-card">
      <div class="badge">停车缴费查询</div>
      <div class="login-title">WeLog 停车服务台</div>
      <div class="login-subtitle">输入车辆信息与支付密码，继续查看动态列表</div>
      <form @submit.prevent="handleLogin">
        <div class="form-row">
          <label class="helper-text">车牌号</label>
          <input v-model="plate" class="input-field" placeholder="粤B·12345" />
        </div>
        <div class="form-row">
          <label class="helper-text">停车场</label>
          <select v-model="parkingLot" class="select-field">
            <option value="福田中心停车场">福田中心停车场</option>
            <option value="滨海湾停车场">滨海湾停车场</option>
            <option value="科创园停车场">科创园停车场</option>
          </select>
        </div>
        <div class="form-row">
          <label class="helper-text">支付密码</label>
          <input v-model="password" type="password" class="input-field" placeholder="输入支付密码" />
        </div>
        <div class="actions">
          <button type="button" class="button-secondary" @click="reset">重新输入</button>
          <button type="submit" class="button-primary">查询并进入</button>
        </div>
        <p v-if="error" class="helper-text" style="color: #e0245e; margin-top: 12px;">
          {{ error }}
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../services/api";

const router = useRouter();
const plate = ref("");
const parkingLot = ref("福田中心停车场");
const password = ref("");
const error = ref("");
const monthStorageKey = "we-log-month";

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

const ensureMonthStorage = () => {
  const stored = normalizeMonth(localStorage.getItem(monthStorageKey));
  const month = stored || getBeijingMonth();
  if (month) {
    localStorage.setItem(monthStorageKey, month);
  }
  return month;
};

const handleLogin = async () => {
  error.value = "";
  try {
    const result = await login(password.value.trim());
    localStorage.setItem("we-log-user", result.user);
    ensureMonthStorage();
    router.push("/feed");
  } catch (err) {
    error.value = err.response?.data?.message || "登录失败";
  }
};

const reset = () => {
  plate.value = "";
  password.value = "";
  error.value = "";
};
</script>
