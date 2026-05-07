<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">收入管理</text>
      <view class="header-btn" @tap="showAdd">+ 添加</view>
    </view>
    <scroll-view scroll-y class="list-scroll">
      <view class="card" v-for="item in list" :key="item._id">
        <view class="card-body">
          <text class="card-name">{{ item.clientName }}</text>
          <text class="card-amount">{{ item.amountText || (item.amount || 0).toFixed(2) }}元</text>
        </view>
        <text class="card-muted">{{ item.date }}</text>
      </view>
      <view class="empty" v-if="list.length === 0">暂无收入记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const list = ref([])
onShow(() => {
  const now = new Date()
  const m = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  api.getIncomes(m).then(r => {
    list.value = r.data.map(item => ({
      ...item,
      amountText: (item.amount || 0).toFixed(2)
    }))
  })
})
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
.card { background: var(--surface); border-radius: var(--radius-md); padding: 24rpx; margin-bottom: 12rpx; box-shadow: var(--shadow-sm); }
.card-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6rpx; }
.card-name { font-size: 30rpx; font-weight: 600; color: var(--text); }
.card-amount { font-size: 30rpx; font-weight: 700; color: var(--green); }
.card-muted { font-size: 24rpx; color: var(--text-tertiary); }
.empty { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
</style>
