<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">工人管理</text>
      <view class="header-btn" @tap="showAdd">+ 添加</view>
    </view>
    <scroll-view scroll-y class="list-scroll">
      <view class="search-bar">
        <input class="search-input" placeholder="搜索工人" v-model="kw" @input="onSearch" />
      </view>
      <view class="card" v-for="w in filtered" :key="w._id">
        <view class="card-body">
          <text class="card-name">{{ w.name }}</text>
          <text class="card-muted">{{ w.phone || '无电话' }}</text>
        </view>
      </view>
      <view class="empty" v-if="filtered.length === 0">暂无工人</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const list = ref([])
const filtered = ref([])
const kw = ref('')

onShow(() => { load() })
function load() {
  api.getWorkers().then(r => { list.value = r.data; filtered.value = r.data })
}
function onSearch() {
  filtered.value = list.value.filter(w => w.name.indexOf(kw.value) > -1)
}
function showAdd() {
  uni.showToast({ title: '添加功能在开发中', icon: 'none' })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.header-btn { font-size: 28rpx; color: var(--primary); font-weight: 600; padding: 8rpx 20rpx; background: var(--primary-light); border-radius: var(--radius-sm); }
.list-scroll { padding: 16rpx 32rpx; }
.search-bar { padding: 0 0 16rpx; }
.search-input { width: 100%; height: 64rpx; background: var(--primary-light); border-radius: 32rpx; padding: 0 28rpx; font-size: 28rpx; box-sizing: border-box; }
.card { background: var(--surface); border-radius: var(--radius-md); padding: 24rpx; margin-bottom: 12rpx; box-shadow: var(--shadow-sm); }
.card-body { display: flex; justify-content: space-between; align-items: center; }
.card-name { font-size: 32rpx; font-weight: 600; color: var(--text); }
.card-muted { font-size: 26rpx; color: var(--text-tertiary); }
.empty { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
</style>
