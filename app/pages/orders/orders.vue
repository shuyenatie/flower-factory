<template>
  <view class="page">
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: tab === 'pending' }" @tap="switchTab('pending')">进行中</view>
      <view class="tab-item" :class="{ active: tab === 'completed' }" @tap="switchTab('completed')">已完成</view>
    </view>
    <scroll-view scroll-y class="list-scroll">
      <view class="card" v-for="o in orders" :key="o._id" @tap="goDetail(o._id)">
        <view class="card-body">
          <text class="card-name">{{ o.orderNo || o.clientName }}</text>
          <text class="card-badge" :class="o.status === 'completed' ? 'green' : 'gold'">{{ o.status === 'completed' ? '已完成' : '进行中' }}</text>
        </view>
        <text class="card-muted">{{ o.clientName }} · {{ o.orderDate }}</text>
      </view>
      <view class="empty" v-if="orders.length === 0">暂无订单</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const tab = ref('pending')
const orders = ref([])

onShow(() => { load() })
function load() {
  api.getOrders(tab.value).then(r => { orders.value = r.data })
}
function switchTab(t) {
  tab.value = t
  load()
}
function goDetail(id) {
  uni.showToast({ title: '详情页在开发中', icon: 'none' })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.tab-bar { display: flex; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.tab-item { flex: 1; text-align: center; padding: 20rpx; font-size: 30rpx; color: var(--text-secondary); font-weight: 500; }
.tab-item.active { color: var(--primary); border-bottom: 3rpx solid var(--primary); }
.list-scroll { padding: 16rpx 32rpx; }
.card { background: var(--surface); border-radius: var(--radius-md); padding: 24rpx; margin-bottom: 12rpx; box-shadow: var(--shadow-sm); }
.card-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.card-name { font-size: 32rpx; font-weight: 600; color: var(--text); }
.card-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.card-badge.gold { background: var(--gold-light); color: #8a703a; }
.card-badge.green { background: var(--green-light); color: var(--green); }
.card-muted { font-size: 26rpx; color: var(--text-tertiary); }
.empty { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
</style>
