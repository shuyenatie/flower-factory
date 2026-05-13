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
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索工人或花型"
          @input="onSearchInput"
        />
      </view>

      <view class="worker-group" v-for="group in filteredGroupedData" :key="group.workerId">
        <view class="worker-row" @tap="toggleExpand(group.workerId)">
          <view class="worker-row-left">
            <text class="worker-row-name">{{ group.workerName }}</text>
            <text class="worker-row-qty">{{ group.totalQuantity }}件 · {{ group.records.length }}种花</text>
          </view>
          <view class="worker-row-right">
            <text class="worker-row-amount">{{ group.amountText }}</text>
            <text class="expand-icon">{{ group.expanded ? '▲' : '▼' }}</text>
          </view>
        </view>

        <view class="detail-list" v-if="group.expanded">
          <view class="detail-item" v-for="record in group.records" :key="record._id" @tap="deleteRecord(record)">
            <text class="detail-product">{{ record.productName }}</text>
            <text class="detail-qty">{{ record.quantity }}件 × {{ record.price }}元</text>
            <text class="detail-amount">{{ record.amountText }}</text>
          </view>
        </view>
      </view>

      <view class="empty-tip" v-if="totalCount === 0">当天没有记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, isLoggedIn } from '../../api'

const currentDate = ref('')
const displayDate = ref('')
const groupedData = ref([])
const filteredGroupedData = ref([])
const searchText = ref('')
const totalCount = ref(0)
const totalAmount = ref('0.0')

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateLabel(date) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${weekdays[date.getDay()]}`
}

function initDate() {
  const now = new Date()
  currentDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  displayDate.value = formatDateLabel(now)
}

function mergeRecords(group) {
  const merged = {}

  group.records.forEach((record) => {
    const key = record.productId || record.productName
    if (!merged[key]) {
      merged[key] = {
        ...record,
        quantity: 0,
        amount: 0,
        amountText: ''
      }
    }

    merged[key].quantity += record.quantity
    merged[key].amount += record.amount
  })

  group.records = Object.keys(merged).map((key) => {
    const item = merged[key]
    item.amountText = `${item.amount.toFixed(1)}元`
    return item
  })
  group.amountText = `${group.totalAmount.toFixed(1)}元`

  return group
}

function loadRecords() {
  api.getRecordsByDate(currentDate.value)
    .then((res) => {
      const raw = res.data || []
      const groups = {}

      raw.forEach((record) => {
        const workerId = record.workerId
        if (!groups[workerId]) {
          groups[workerId] = {
            workerId,
            workerName: record.workerName,
            totalQuantity: 0,
            totalAmount: 0,
            amountText: '',
            expanded: false,
            records: []
          }
        }

        const amount = Number(record.quantity || 0) * Number(record.price || 0)
        groups[workerId].totalQuantity += Number(record.quantity || 0)
        groups[workerId].totalAmount += amount
        groups[workerId].records.push({
          _id: record._id,
          productId: record.productId,
          productName: record.productName,
          quantity: Number(record.quantity || 0),
          price: Number(record.price || 0),
          amount,
          amountText: `${amount.toFixed(1)}元`
        })
      })

      const list = Object.keys(groups)
        .map((workerId) => mergeRecords(groups[workerId]))
        .sort((a, b) => b.totalAmount - a.totalAmount)

      let allAmount = 0
      let allCount = 0
      list.forEach((group) => {
        allAmount += group.totalAmount
        allCount += group.records.length
      })

      groupedData.value = list
      filteredGroupedData.value = list
      totalCount.value = allCount
      totalAmount.value = allAmount.toFixed(1)
    })
    .catch(() => {
      groupedData.value = []
      filteredGroupedData.value = []
      totalCount.value = 0
      totalAmount.value = '0.0'
    })
}

function onDateChange(e) {
  const date = new Date(e.detail.value)
  currentDate.value = e.detail.value
  displayDate.value = formatDateLabel(date)
  loadRecords()
}

function onSearchInput() {
  const keyword = searchText.value.trim()
  filteredGroupedData.value = groupedData.value.filter((group) => {
    if (group.workerName.indexOf(keyword) > -1) {
      return true
    }

    return group.records.some((record) => record.productName.indexOf(keyword) > -1)
  })
}

function toggleExpand(workerId) {
  const updateGroup = (group) => {
    if (group.workerId === workerId) {
      return {
        ...group,
        expanded: !group.expanded
      }
    }

    return group
  }

  groupedData.value = groupedData.value.map(updateGroup)
  filteredGroupedData.value = filteredGroupedData.value.map(updateGroup)
}

function deleteRecord(record) {
  uni.showModal({
    title: '删除记录',
    content: `确定删除 ${record.productName} × ${record.quantity}件 的记录吗？`,
    success: (res) => {
      if (!res.confirm) {
        return
      }

      api.deleteRecord(record._id)
        .then(() => {
          uni.showToast({ title: '已删除' })
          loadRecords()
        })
        .catch((err) => {
          uni.showToast({ title: err.message || '删除失败', icon: 'none' })
        })
    }
  })
}

initDate()

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }

  loadRecords()
})
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
