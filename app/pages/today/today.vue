<template>
  <view class="page">
    <view class="date-header">
      <picker mode="date" :value="currentDate" @change="onDateChange">
        <view class="date-picker">
          <text class="date-text">{{ displayDate }}</text>
          <text class="date-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="summary-bar">
      <text class="summary-count">共 {{ totalCount }} 条</text>
      <text class="summary-amount">{{ totalAmount }} 元</text>
    </view>

    <scroll-view class="record-list" scroll-y>
      <view class="search-bar">
        <input class="search-input" placeholder="搜索工人或花型" v-model="searchText" @input="onSearchInput" />
      </view>

      <view class="worker-group" v-for="g in filteredGroupedData" :key="g.workerId">
        <view class="worker-row" @tap="toggleExpand(g.workerId)">
          <view class="worker-row-left">
            <text class="worker-row-name">{{ g.workerName }}</text>
            <text class="worker-row-qty">{{ g.totalQuantity }}件 · {{ g.records.length }}种花</text>
          </view>
          <view class="worker-row-right">
            <text class="worker-row-amount">{{ g.amountText }}</text>
            <text class="expand-icon">{{ g.expanded ? '▲' : '▼' }}</text>
          </view>
        </view>

        <view class="detail-list" v-if="g.expanded">
          <view class="detail-item" v-for="r in g.records" :key="r._id" @tap="editRecord(r)">
            <text class="detail-product">{{ r.productName }}</text>
            <text class="detail-qty">{{ r.quantity }}件 × {{ r.price }}元</text>
            <text class="detail-amount">{{ r.amountText }}</text>
          </view>
        </view>
      </view>

      <view class="empty-tip" v-if="totalCount == 0">当天没有记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api, isLoggedIn } from '../../api'

const currentDate = ref('')
const displayDate = ref('')
const groupedData = ref([])
const filteredGroupedData = ref([])
const searchText = ref('')
const totalCount = ref(0)
const totalAmount = ref('0.0')

function pad(n) { return n < 10 ? '0' + n : '' + n }

function initDate() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
  const weekdays = ['日','一','二','三','四','五','六']
  currentDate.value = y + '-' + pad(m) + '-' + pad(d)
  displayDate.value = y + '年' + m + '月' + d + '日 星期' + weekdays[now.getDay()]
}
initDate()

onShow(() => {
  if (!isLoggedIn()) return uni.reLaunch({ url: '/pages/login/login' })
  loadRecords()
})

function loadRecords() {
  api.getRecordsByDate(currentDate.value).then(res => {
    const raw = res.data
    const groups = {}
    raw.forEach(r => {
      const wid = r.workerId
      if (!groups[wid]) {
        groups[wid] = { workerId: wid, workerName: r.workerName, totalQuantity: 0, totalAmount: 0, amountText: '', expanded: false, records: [] }
      }
      groups[wid].totalQuantity += r.quantity
      groups[wid].totalAmount += r.quantity * r.price
      groups[wid].records.push({ _id: r._id, productId: r.productId, productName: r.productName, quantity: r.quantity, price: r.price, amount: r.quantity * r.price, amountText: (r.quantity * r.price).toFixed(1) + '元' })
    })

    const list = Object.keys(groups).map(wid => mergeRecords(groups[wid]))
    list.sort((a, b) => b.totalAmount - a.totalAmount)

    let allAmt = 0, allCnt = 0
    list.forEach(g => { allAmt += g.totalAmount; allCnt += g.records.length })
    groupedData.value = list
    filteredGroupedData.value = list
    totalCount.value = allCnt
    totalAmount.value = allAmt.toFixed(1)
  })
}

function mergeRecords(g) {
  const merged = {}
  g.records.forEach(r => {
    const key = r.productId || r.productName
    if (!merged[key]) merged[key] = { ...r, quantity: 0, amount: 0, amountText: '' }
    merged[key].quantity += r.quantity
    merged[key].amount += r.amount
  })
  g.records = Object.keys(merged).map(k => {
    const m = merged[k]
    m.amountText = m.amount.toFixed(1) + '元'
    return m
  })
  g.amountText = g.totalAmount.toFixed(1) + '元'
  return g
}

function onDateChange(e) {
  const date = new Date(e.detail.value)
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate()
  const weekdays = ['日','一','二','三','四','五','六']
  currentDate.value = e.detail.value
  displayDate.value = y + '年' + m + '月' + d + '日 星期' + weekdays[date.getDay()]
  loadRecords()
}

function onSearchInput() {
  const text = searchText.value
  filteredGroupedData.value = groupedData.value.filter(g => {
    if (g.workerName.indexOf(text) > -1) return true
    return g.records.some(r => r.productName.indexOf(text) > -1)
  })
}

function toggleExpand(wid) {
  groupedData.value = groupedData.value.map(g => {
    if (g.workerId === wid) g.expanded = !g.expanded
    return g
  })
  filteredGroupedData.value = filteredGroupedData.value.map(g => {
    if (g.workerId === wid) g.expanded = !g.expanded
    return g
  })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); padding-bottom: 120rpx; }
.date-header { padding: 16rpx 32rpx 8rpx; }
.date-picker { display: flex; align-items: center; gap: 8rpx; }
.date-text { font-size: 34rpx; font-weight: 700; color: var(--text); }
.date-arrow { font-size: 22rpx; color: var(--text-tertiary); }
.summary-bar { display: flex; justify-content: space-between; align-items: center; margin: 0 32rpx 12rpx; padding: 20rpx; background: var(--surface); border-radius: var(--radius-md); box-shadow: var(--shadow-md); }
.summary-count { font-size: 26rpx; color: var(--text-secondary); }
.summary-amount { font-size: 36rpx; font-weight: 700; color: var(--primary); }
.record-list { padding: 0 32rpx; }
.search-bar { padding: 0 0 16rpx; }
.search-input { width: 100%; height: 64rpx; background: var(--primary-light); border-radius: 32rpx; padding: 0 28rpx; font-size: 28rpx; box-sizing: border-box; }
.worker-group { margin-bottom: 12rpx; }
.worker-row { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border-radius: var(--radius-md); padding: 24rpx; box-shadow: var(--shadow-md); }
.worker-row-left { display: flex; flex-direction: column; gap: 4rpx; }
.worker-row-name { font-size: 32rpx; font-weight: 600; color: var(--text); }
.worker-row-qty { font-size: 24rpx; color: var(--text-tertiary); }
.worker-row-right { display: flex; align-items: center; gap: 12rpx; }
.worker-row-amount { font-size: 34rpx; font-weight: 700; color: var(--accent); }
.expand-icon { font-size: 20rpx; color: var(--text-muted); }
.detail-list { margin: 0 16rpx; }
.detail-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.detail-product { font-size: 28rpx; color: var(--text); flex: 1; }
.detail-qty { font-size: 24rpx; color: var(--text-tertiary); }
.detail-amount { font-size: 28rpx; font-weight: 600; color: var(--accent); }
.empty-tip { text-align: center; padding: 80rpx 32rpx; font-size: 32rpx; color: var(--text-tertiary); }
</style>
