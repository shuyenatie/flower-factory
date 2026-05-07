<template>
  <view>
    <tab-bar v-if="showTab" />
    <router-view />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const showTab = computed(() => {
  const pages = getCurrentPages()
  const route = pages[pages.length - 1]?.route || ''
  return ['pages/index/index', 'pages/today/today', 'pages/mine/mine'].includes(route)
})
</script>

<style>
page {
  font-size: 28rpx;
  color: #1f1a16;
  background: #f1ede6;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  line-height: 1.5;
}
</style>
