<template>
  <view class="page">
    <view class="login-box">
      <text class="title">手工花厂</text>
      <text class="subtitle">计件管理系统</text>

      <input
        v-model="phone"
        class="input"
        type="number"
        maxlength="11"
        placeholder="请输入手机号"
      />

      <view class="code-row">
        <input
          v-model="code"
          class="input code-input"
          type="number"
          maxlength="6"
          placeholder="请输入验证码"
        />
        <button class="code-btn" :disabled="sending" @tap="sendCode">
          {{ sending ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>

      <button class="login-btn" :disabled="!canLogin" @tap="handleLogin">登录</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, isLoggedIn, setPhone, setToken } from '../../api'

const phone = ref('')
const code = ref('')
const sending = ref(false)
const countdown = ref(60)

let timer = null

const canLogin = computed(() => /^1\d{10}$/.test(phone.value) && code.value.trim().length >= 4)

function stopCountdown() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startCountdown() {
  stopCountdown()
  sending.value = true
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopCountdown()
      sending.value = false
    }
  }, 1000)
}

async function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入有效手机号', icon: 'none' })
    return
  }

  startCountdown()

  try {
    await api.sendCode(phone.value)
    uni.showToast({ title: '验证码已发送' })
  } catch (err) {
    stopCountdown()
    sending.value = false
    uni.showToast({ title: err.message || '发送失败', icon: 'none' })
  }
}

async function handleLogin() {
  if (!canLogin.value) {
    return
  }

  uni.showLoading({ title: '登录中...' })

  try {
    const res = await api.login(phone.value, code.value)
    setToken(res.token)
    setPhone(res.phone || phone.value)
    uni.hideLoading()
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
}

onShow(() => {
  if (isLoggedIn()) {
    uni.reLaunch({ url: '/pages/index/index' })
  }
})
</script>

<style>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 40rpx;
}

.login-box {
  width: 100%;
  max-width: 600rpx;
  background: var(--surface);
  border-radius: var(--radius-xl);
  padding: 80rpx 48rpx 60rpx;
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: var(--primary);
}

.subtitle {
  display: block;
  margin-top: 10rpx;
  margin-bottom: 60rpx;
  font-size: 30rpx;
  color: var(--text-secondary);
}

.input {
  width: 100%;
  height: 80rpx;
  margin-bottom: 20rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border: 1.5rpx solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  font-size: 32rpx;
}

.code-row {
  display: flex;
  gap: 16rpx;
}

.code-input {
  flex: 1;
}

.code-btn {
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 24rpx;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--primary-light);
  color: var(--primary);
  font-size: 28rpx;
  white-space: nowrap;
}

.code-btn[disabled] {
  opacity: 0.5;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 40rpx;
  border: none;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
}

.login-btn[disabled] {
  opacity: 0.4;
}
</style>
