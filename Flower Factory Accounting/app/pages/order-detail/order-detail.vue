<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">加工单详情</text>
    </view>
    <view class="section" v-if="order">
      <view class="info-row"><text class="info-label">单号</text><text class="info-value">{{ order.orderNo || '-' }}</text></view>
      <view class="info-row"><text class="info-label">拿货商</text><text class="info-value">{{ order.clientName }}</text></view>
      <view class="info-row"><text class="info-label">取材料日期</text><text class="info-value">{{ order.orderDate }}</text></view>
      <view class="info-row" v-if="order.status === 'completed'"><text class="info-label">实际送回</text><text class="info-value">{{ order.actualReturnDate }}</text></view>
      <view class="info-row"><text class="info-label">状态</text><text class="info-value badge" :class="order.status === 'completed' ? 'green' : 'gold'">{{ order.status === 'completed' ? '已完成' : '进行中' }}</text></view>
      <view class="info-row" v-if="order.processingFee"><text class="info-label">加工费</text><text class="info-value">{{ order.processingFee }}元</text></view>
    </view>
    <view v-else class="loading">加载中...</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../../api'

const order = ref(null)

onLoad((e) => {
  if (e && e.id) {
    api.getOrders('pending').then(r => { const f = r.data.find(o => o._id === e.id); if (f) order.value = f })
    api.getOrders('completed').then(r => { const f = r.data.find(o => o._id === e.id); if (f) order.value = f })
  }
})
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.section { padding: 24rpx 32rpx; }
.info-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid var(--border-light); }
.info-label { font-size: 28rpx; color: var(--text-secondary); }
.info-value { font-size: 28rpx; font-weight: 600; color: var(--text); }
.info-value.badge.green { color: var(--green); }
.info-value.badge.gold { color: #8a703a; }
.loading { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
</style>
