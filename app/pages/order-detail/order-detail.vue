<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">加工单详情</text>
    </view>
    <view class="section">
      <text class="section-title">花型列表</text>
      <view class="empty">数据加载中...</view>
    </view>
  </view>
</template>

<script setup>
import { onLoad } from 'vue'

onLoad(() => {
  // 详情页在开发中
})
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.section { padding: 24rpx 32rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: var(--text); margin-bottom: 12rpx; }
.empty { text-align: center; padding: 60rpx; font-size: 28rpx; color: var(--text-tertiary); }
</style>
