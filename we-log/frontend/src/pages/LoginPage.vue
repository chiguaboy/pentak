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

const handleLogin = async () => {
  error.value = "";
  try {
    const result = await login(password.value.trim());
    localStorage.setItem("we-log-user", result.user);
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
