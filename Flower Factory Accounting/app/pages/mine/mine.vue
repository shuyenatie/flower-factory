<template>
  <view class="page">
    <view class="manage-bar">
      <view class="manage-link" @tap="goWorkers">工人管理</view>
      <view class="manage-link" @tap="goProducts">花型管理</view>
      <view class="manage-link" @tap="goIncome">收入</view>
      <view class="manage-link" @tap="goExpense">支出</view>
    </view>

    <view class="header-row">
      <view class="month-nav">
        <text class="nav-btn" @tap="prevMonth">‹</text>
        <text class="month-title">{{ yearMonth }}</text>
        <text class="nav-btn" @tap="nextMonth">›</text>
      </view>

      <view class="total-amount">{{ totalAmount }} 元</view>

      <view class="action-row">
        <text class="action-btn" @tap="copySummary">复制</text>
        <text class="action-btn primary" @tap="exportExcel">导出</text>
      </view>
    </view>

    <scroll-view class="list-scroll" scroll-y>
      <view class="search-bar">
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索工人"
          @input="onSearchInput"
        />
      </view>

      <view class="worker-group" v-for="worker in filteredWorkerData" :key="worker.workerId">
        <view class="worker-row" @tap="toggleExpand(worker.workerId)">
          <view class="worker-row-left">
            <text class="worker-row-name">{{ worker.workerName }}</text>
            <text class="worker-row-qty">{{ worker.totalQuantity }}件</text>
          </view>

          <view class="worker-row-right">
            <text class="worker-row-amount">{{ worker.amountText }}</text>
            <text class="expand-icon">{{ worker.expanded ? '▲' : '▼' }}</text>
          </view>
        </view>

        <view class="detail-list" v-if="worker.expanded">
          <view class="detail-item" v-for="record in worker.records" :key="record._id">
            <text class="detail-product">{{ record.productName }}</text>
            <text class="detail-qty">{{ record.quantity }}件 × {{ record.price }}元</text>
            <text class="detail-amount">{{ record.amountText }}</text>
          </view>
        </view>
      </view>

      <view class="empty-tip" v-if="!hasData">本月暂无计件记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, isLoggedIn } from '../../api'

const year = ref(0)
const month = ref(0)
const yearMonth = ref('')
const totalAmount = ref('0.0')
const workersData = ref([])
const filteredWorkerData = ref([])
const searchText = ref('')
const hasData = ref(false)

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function updateTitle() {
  yearMonth.value = `${year.value}年${month.value}月`
}

function init() {
  const now = new Date()
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
  updateTitle()
}

function getMonthStr() {
  return `${year.value}-${pad(month.value)}`
}

function loadData() {
  api.getSalary(getMonthStr())
    .then((res) => {
      const list = (res.data || []).map((worker) => ({
        ...worker,
        expanded: false,
        amountText: `${Number(worker.totalAmount || 0).toFixed(1)}元`,
        records: []
      }))

      workersData.value = list
      filteredWorkerData.value = list
      hasData.value = list.length > 0

      const amount = list.reduce((sum, worker) => sum + Number(worker.totalAmount || 0), 0)
      totalAmount.value = amount.toFixed(1)

      return api.getRecordsByMonth(getMonthStr())
    })
    .then((recordRes) => {
      const recordMap = {}

      ;(recordRes.data || []).forEach((record) => {
        const workerId = record.workerId
        if (!recordMap[workerId]) {
          recordMap[workerId] = []
        }

        const amount = Number(record.quantity || 0) * Number(record.price || 0)
        recordMap[workerId].push({
          _id: record._id,
          productId: record.productId,
          productName: record.productName,
          quantity: Number(record.quantity || 0),
          price: Number(record.price || 0),
          amount,
          amountText: `${amount.toFixed(1)}元`
        })
      })

      workersData.value = workersData.value.map((worker) => {
        const records = recordMap[worker.workerId] || []
        const merged = {}

        records.forEach((record) => {
          const key = record.productId || record.productName
          if (!merged[key]) {
            merged[key] = {
              ...record,
              quantity: 0,
              amount: 0
            }
          }

          merged[key].quantity += record.quantity
          merged[key].amount += record.amount
        })

        worker.records = Object.keys(merged).map((key) => {
          const item = merged[key]
          item.amountText = `${item.amount.toFixed(1)}元`
          return item
        })

        return worker
      })

      filteredWorkerData.value = workersData.value
    })
    .catch(() => {
      workersData.value = []
      filteredWorkerData.value = []
      totalAmount.value = '0.0'
      hasData.value = false
    })
}

function prevMonth() {
  month.value -= 1
  if (month.value < 1) {
    month.value = 12
    year.value -= 1
  }
  updateTitle()
  loadData()
}

function nextMonth() {
  month.value += 1
  if (month.value > 12) {
    month.value = 1
    year.value += 1
  }
  updateTitle()
  loadData()
}

function toggleExpand(workerId) {
  const updateWorker = (worker) => {
    if (worker.workerId === workerId) {
      return {
        ...worker,
        expanded: !worker.expanded
      }
    }

    return worker
  }

  workersData.value = workersData.value.map(updateWorker)
  filteredWorkerData.value = filteredWorkerData.value.map(updateWorker)
}

function onSearchInput() {
  const keyword = searchText.value.trim()
  filteredWorkerData.value = workersData.value.filter((worker) => worker.workerName.indexOf(keyword) > -1)
}

function copySummary() {
  let text = `${yearMonth.value}工资汇总：\n`
  workersData.value.forEach((worker) => {
    text += `${worker.workerName}：共计 ${worker.totalQuantity}件，工资 ${worker.amountText}\n`
  })

  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制到剪贴板' })
  })
}

function exportExcel() {
  uni.showLoading({ title: '生成中...' })
  const url = api.exportSalary(getMonthStr())

  uni.downloadFile({
    url,
    success: (res) => {
      uni.hideLoading()
      uni.openDocument({ filePath: res.tempFilePath, showMenu: true })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '导出失败', icon: 'none' })
    }
  })
}

function goWorkers() {
  uni.navigateTo({ url: '/pages/workers/workers' })
}

function goProducts() {
  uni.navigateTo({ url: '/pages/products/products' })
}

function goIncome() {
  uni.navigateTo({ url: '/pages/incomes/incomes' })
}

function goExpense() {
  uni.navigateTo({ url: '/pages/expenses/expenses' })
}

init()

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }

  loadData()
})
</script>

<style>
.page { min-height: 100vh; background: var(--bg); padding-bottom: 120rpx; }
.manage-bar { display: flex; justify-content: center; gap: 12rpx; padding: 12rpx 24rpx 20rpx; }
.manage-link { font-size: 29rpx; color: var(--text-secondary); padding: 12rpx 24rpx; background: var(--surface); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
.header-row { padding: 16rpx 32rpx; display: flex; flex-direction: column; gap: 12rpx; }
.month-nav { display: flex; align-items: center; justify-content: center; gap: 20rpx; }
.nav-btn { font-size: 40rpx; color: var(--primary); padding: 8rpx; }
.month-title { font-size: 36rpx; font-weight: 700; color: var(--text); }
.total-amount { font-size: 44rpx; font-weight: 700; color: var(--primary); text-align: center; }
.action-row { display: flex; justify-content: center; gap: 16rpx; }
.action-btn { padding: 8rpx 28rpx; font-size: 26rpx; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary); }
.action-btn.primary { background: var(--primary); color: #fff; }
.list-scroll { padding: 0 32rpx; }
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
