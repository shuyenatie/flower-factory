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
        <input class="search-input" placeholder="搜索工人" v-model="searchText" @input="onSearchInput" />
      </view>

      <view class="worker-group" v-for="w in filteredWorkerData" :key="w.workerId">
        <view class="worker-row" @tap="toggleExpand(w.workerId)">
          <view class="worker-row-left">
            <text class="worker-row-name">{{ w.workerName }}</text>
            <text class="worker-row-qty">{{ w.totalQuantity }}件</text>
          </view>
          <view class="worker-row-right">
            <text class="worker-row-amount">{{ w.amountText }}</text>
            <text class="expand-icon">{{ w.expanded ? '▲' : '▼' }}</text>
          </view>
        </view>

        <view class="detail-list" v-if="w.expanded">
          <view class="detail-item" v-for="r in w.records" :key="r._id">
            <text class="detail-product">{{ r.productName }}</text>
            <text class="detail-qty">{{ r.quantity }}件 × {{ r.price }}元</text>
            <text class="detail-amount">{{ r.amountText }}</text>
          </view>
        </view>
      </view>

      <view class="empty-tip" v-if="!hasData">本月暂无计件记录</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api, isLoggedIn } from '../../api'

const year = ref(0), month = ref(0)
const yearMonth = ref('')
const totalAmount = ref('0.0')
const workersData = ref([])
const filteredWorkerData = ref([])
const searchText = ref('')
const hasData = ref(false)

function pad(n) { return n < 10 ? '0' + n : '' + n }

function init() {
  const now = new Date()
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
  updateTitle()
}
init()

onShow(() => {
  if (!isLoggedIn()) return uni.reLaunch({ url: '/pages/login/login' })
  loadData()
})

function updateTitle() {
  yearMonth.value = year.value + '年' + month.value + '月'
}

function getMonthStr() { return year.value + '-' + pad(month.value) }

function loadData() {
  api.getSalary(getMonthStr()).then(res => {
    const list = res.data
    list.forEach(w => {
      w.expanded = false
      w.amountText = w.totalAmount.toFixed(1) + '元'
      w.records = []
    })
    workersData.value = list
    filteredWorkerData.value = list
    hasData.value = list.length > 0
    let total = 0
    list.forEach(w => total += w.totalAmount)
    totalAmount.value = total.toFixed(1)

    // load detail records
    api.getRecordsByMonth(getMonthStr()).then(rRes => {
      const rMap = {}
      rRes.data.forEach(r => {
        const wid = r.workerId
        if (!rMap[wid]) rMap[wid] = []
        rMap[wid].push({ _id: r._id, productId: r.productId, productName: r.productName, quantity: r.quantity, price: r.price, amount: r.quantity * r.price, amountText: (r.quantity * r.price).toFixed(1) + '元' })
      })
      workersData.value = workersData.value.map(w => {
        const records = rMap[w.workerId] || []
        const merged = {}
        records.forEach(r => {
          const key = r.productId || r.productName
          if (!merged[key]) merged[key] = { ...r, quantity: 0, amount: 0 }
          merged[key].quantity += r.quantity
          merged[key].amount += r.amount
        })
        w.records = Object.keys(merged).map(k => {
          const m = merged[k]
          m.amountText = m.amount.toFixed(1) + '元'
          return m
        })
        return w
      })
      filteredWorkerData.value = workersData.value
    })
  })
}

function prevMonth() {
  month.value--
  if (month.value < 1) { month.value = 12; year.value-- }
  updateTitle()
  loadData()
}

function nextMonth() {
  month.value++
  if (month.value > 12) { month.value = 1; year.value++ }
  updateTitle()
  loadData()
}

function toggleExpand(wid) {
  workersData.value = workersData.value.map(w => {
    if (w.workerId === wid) w.expanded = !w.expanded
    return w
  })
  filteredWorkerData.value = filteredWorkerData.value.map(w => {
    if (w.workerId === wid) w.expanded = !w.expanded
    return w
  })
}

function onSearchInput() {
  const text = searchText.value
  filteredWorkerData.value = workersData.value.filter(w => w.workerName.indexOf(text) > -1)
}

function copySummary() {
  let text = yearMonth.value + '工资汇总：\n'
  workersData.value.forEach(w => {
    text += w.workerName + '：共计' + w.totalQuantity + '件，工资 ' + w.amountText + '\n'
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

function goWorkers() { uni.navigateTo({ url: '/pages/workers/workers' }) }
function goProducts() { uni.navigateTo({ url: '/pages/products/products' }) }
function goIncome() { uni.navigateTo({ url: '/pages/incomes/incomes' }) }
function goExpense() { uni.navigateTo({ url: '/pages/expenses/expenses' }) }
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
