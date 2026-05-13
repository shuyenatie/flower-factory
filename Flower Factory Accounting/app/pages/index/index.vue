<template>
  <view class="page">
    <view class="manage-bar">
      <view class="manage-link" @tap="goWorkers">工人管理</view>
      <view class="manage-link" @tap="goProducts">花型管理</view>
      <view class="manage-link" @tap="goClients">拿货商</view>
      <view class="manage-link" @tap="goOrders">加工单</view>
    </view>

    <view class="date-header">
      <picker mode="date" :value="currentDate" @change="onDateChange">
        <view class="date-picker">
          <text class="date-text">{{ displayDate }}</text>
          <text class="date-arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="summary-bar">
      <view class="summary-left">
        <text class="summary-label">
          本月 {{ summaryWorkerCount }} 人 · {{ summaryDayCount }} 天 · {{ summaryTotalQty }} 件
        </text>
        <text class="summary-total">{{ summaryTotalAmount }} 元</text>
      </view>
    </view>

    <scroll-view class="worker-list" scroll-y>
      <view class="search-bar">
        <input
          v-model="searchText"
          class="search-input"
          placeholder="搜索工人"
          @input="onSearchInput"
        />
      </view>

      <view class="worker-card" v-for="worker in filteredWorkers" :key="worker._id" @tap="selectWorker(worker)">
        <text class="worker-name">{{ worker.name }}</text>
        <text class="worker-arrow">→</text>
      </view>

      <view class="empty-tip" v-if="workersEmpty">暂无在职工人，请先添加工人</view>
    </scroll-view>

    <view class="sheet-overlay" :class="{ show: showSheet }" @tap="closeSheet">
      <view class="sheet" :class="{ show: showSheet }" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">{{ selectedWorker ? selectedWorker.name : '' }}</text>
          <text class="sheet-close" @tap="closeSheet">取消</text>
        </view>

        <view class="sheet-body">
          <text class="sheet-tip">选择花型</text>

          <input
            v-model="productSearchText"
            class="search-input"
            placeholder="搜索花型"
            @input="onProductSearch"
          />

          <view class="grid-2col">
            <view
              v-for="product in filteredProducts"
              :key="product._id"
              class="product-card"
              :class="{ active: selectedProduct && selectedProduct._id === product._id }"
              @tap="selectProduct(product)"
            >
              <text class="product-name">{{ product.modelNo ? `${product.modelNo}-` : '' }}{{ product.name }}</text>
              <text class="product-price">{{ product.price }} 元/件</text>
            </view>
          </view>

          <view class="qty-section" v-if="selectedProduct">
            <text class="qty-title">{{ selectedProduct.name }} · 录入数量</text>

            <view class="qty-quick">
              <view class="qty-btn" v-for="quick in [50, 100, 200, 500]" :key="quick" @tap="setQuantity(quick)">
                {{ quick }}
              </view>
            </view>

            <view class="qty-input-row">
              <text class="qty-label">数量</text>
              <input
                v-model="quantity"
                class="qty-input"
                type="number"
                placeholder="0"
                :focus="autoFocus"
                @input="updatePreview"
              />
              <text class="qty-unit">件</text>
            </view>

            <view class="qty-preview" v-if="previewText">{{ previewText }}</view>

            <button class="submit-btn" :disabled="!canSubmit" @tap="submitRecord">保存记录</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api, isLoggedIn } from '../../api'

const currentDate = ref('')
const displayDate = ref('')
const workers = ref([])
const filteredWorkers = ref([])
const searchText = ref('')
const products = ref([])
const filteredProducts = ref([])
const productSearchText = ref('')
const showSheet = ref(false)
const selectedWorker = ref(null)
const selectedProduct = ref(null)
const quantity = ref('')
const canSubmit = ref(false)
const previewText = ref('')
const autoFocus = ref(false)
const workersEmpty = ref(true)
const summaryWorkerCount = ref(0)
const summaryDayCount = ref(0)
const summaryTotalQty = ref(0)
const summaryTotalAmount = ref('0.0')

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

function loadData() {
  Promise.all([api.getWorkers(), api.getProducts()])
    .then(([workerRes, productRes]) => {
      workers.value = workerRes.data || []
      filteredWorkers.value = workerRes.data || []
      products.value = productRes.data || []
      filteredProducts.value = productRes.data || []
      workersEmpty.value = workers.value.length === 0
    })
    .catch(() => {
      workers.value = []
      filteredWorkers.value = []
      products.value = []
      filteredProducts.value = []
      workersEmpty.value = true
    })
}

function loadMonthSummary() {
  const now = new Date(currentDate.value || Date.now())
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

  api.getRecordsByMonth(month)
    .then((res) => {
      const records = res.data || []
      const workerSet = new Set()
      const daySet = new Set()
      let totalQty = 0
      let totalAmount = 0

      records.forEach((record) => {
        workerSet.add(record.workerId)
        daySet.add(record.date)
        totalQty += Number(record.quantity || 0)
        totalAmount += Number(record.quantity || 0) * Number(record.price || 0)
      })

      summaryWorkerCount.value = workerSet.size
      summaryDayCount.value = daySet.size
      summaryTotalQty.value = totalQty
      summaryTotalAmount.value = totalAmount.toFixed(1)
    })
    .catch(() => {
      summaryWorkerCount.value = 0
      summaryDayCount.value = 0
      summaryTotalQty.value = 0
      summaryTotalAmount.value = '0.0'
    })
}

function onDateChange(e) {
  const date = new Date(e.detail.value)
  currentDate.value = e.detail.value
  displayDate.value = formatDateLabel(date)
}

function onSearchInput() {
  const keyword = searchText.value.trim()
  filteredWorkers.value = workers.value.filter((worker) => worker.name.indexOf(keyword) > -1)
}

function onProductSearch() {
  const keyword = productSearchText.value.trim()
  filteredProducts.value = products.value.filter((product) => {
    const text = `${product.name || ''} ${product.modelNo || ''}`
    return text.indexOf(keyword) > -1
  })
}

function selectWorker(worker) {
  selectedWorker.value = worker
  selectedProduct.value = null
  quantity.value = ''
  canSubmit.value = false
  previewText.value = ''
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
  selectedWorker.value = null
  selectedProduct.value = null
  quantity.value = ''
  canSubmit.value = false
  previewText.value = ''
}

function selectProduct(product) {
  selectedProduct.value = product
  quantity.value = ''
  canSubmit.value = false
  previewText.value = ''
  autoFocus.value = false
  uni.nextTick(() => {
    autoFocus.value = true
  })
}

function setQuantity(value) {
  quantity.value = String(value)
  updatePreview()
}

function updatePreview() {
  const product = selectedProduct.value
  const count = parseInt(quantity.value, 10)
  const valid = Number.isFinite(count) && count > 0

  if (valid && product) {
    const amount = count * Number(product.price || 0)
    previewText.value = `${product.name} × ${count}件 = ${amount.toFixed(1)}元`
  } else {
    previewText.value = ''
  }

  canSubmit.value = valid
}

function submitRecord() {
  const worker = selectedWorker.value
  const product = selectedProduct.value
  const count = parseInt(quantity.value, 10)

  if (!worker || !product || !Number.isFinite(count) || count <= 0) {
    return
  }

  uni.showLoading({ title: '保存中...' })

  api.addRecord({
    workerId: worker._id,
    workerName: worker.name,
    productId: product._id,
    productName: product.name,
    quantity: count,
    price: Number(product.price || 0),
    date: currentDate.value
  })
    .then(() => {
      uni.hideLoading()
      uni.showToast({ title: '已记录' })
      uni.vibrateShort({ type: 'light' })
      closeSheet()
      loadMonthSummary()
    })
    .catch((err) => {
      uni.hideLoading()
      uni.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
}

function goWorkers() {
  uni.navigateTo({ url: '/pages/workers/workers' })
}

function goProducts() {
  uni.navigateTo({ url: '/pages/products/products' })
}

function goClients() {
  uni.navigateTo({ url: '/pages/clients/clients' })
}

function goOrders() {
  uni.navigateTo({ url: '/pages/orders/orders' })
}

initDate()

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }

  loadData()
  loadMonthSummary()
})
</script>

<style>
.page { min-height: 100vh; background: var(--bg); padding-bottom: 120rpx; }
.manage-bar { display: flex; justify-content: center; gap: 12rpx; padding: 12rpx 24rpx 20rpx; }
.manage-link { font-size: 29rpx; color: var(--text-secondary); padding: 12rpx 24rpx; background: var(--surface); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
.date-header { padding: 8rpx 32rpx; }
.date-picker { display: flex; align-items: center; gap: 8rpx; }
.date-text { font-size: 34rpx; font-weight: 700; color: var(--text); }
.date-arrow { font-size: 22rpx; color: var(--text-tertiary); }
.summary-bar { margin: 0 32rpx 16rpx; padding: 20rpx; background: var(--surface); border-radius: var(--radius-md); box-shadow: var(--shadow-md); }
.summary-label { font-size: 26rpx; color: var(--text-secondary); }
.summary-total { font-size: 44rpx; font-weight: 700; color: var(--primary); margin-top: 4rpx; }
.summary-left { display: flex; flex-direction: column; }
.search-bar { padding: 0 0 16rpx; }
.search-input { width: 100%; height: 64rpx; background: var(--primary-light); border-radius: 32rpx; padding: 0 28rpx; font-size: 28rpx; box-sizing: border-box; }
.worker-list { padding: 0 32rpx; }
.worker-card { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border-radius: var(--radius-md); padding: 28rpx; margin-bottom: 12rpx; box-shadow: var(--shadow-md); }
.worker-name { font-size: 34rpx; font-weight: 600; color: var(--text); }
.worker-arrow { font-size: 28rpx; color: var(--text-tertiary); }
.empty-tip { text-align: center; padding: 80rpx 32rpx; font-size: 32rpx; color: var(--text-tertiary); }
.sheet-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(31,26,22,0.4); z-index: 999; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
.sheet-overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-radius: var(--radius-xl) var(--radius-xl) 0 0; max-height: 85vh; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); box-shadow: var(--shadow-xl); }
.sheet.show { transform: translateY(0); }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 32rpx 12rpx; }
.sheet-title { font-size: 40rpx; font-weight: 700; color: var(--text); }
.sheet-close { font-size: 28rpx; color: var(--text-tertiary); padding: 8rpx 16rpx; }
.sheet-body { flex: 1; overflow-y: auto; padding: 8rpx 32rpx 12rpx; }
.sheet-tip { font-size: 30rpx; font-weight: 600; color: var(--text); margin-bottom: 14rpx; }
.grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 14rpx; }
.product-card { background: var(--bg); border-radius: var(--radius-md); padding: 20rpx; text-align: center; border: 2rpx solid transparent; }
.product-card.active { border-color: var(--primary); background: var(--primary-light); }
.product-name { font-size: 26rpx; font-weight: 600; color: var(--text); }
.product-price { font-size: 22rpx; color: var(--text-tertiary); margin-top: 4rpx; }
.qty-section { margin-top: 24rpx; padding-top: 20rpx; border-top: 1rpx solid var(--border-light); }
.qty-title { font-size: 28rpx; font-weight: 600; color: var(--text); display: block; margin-bottom: 14rpx; }
.qty-quick { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.qty-btn { flex: 1; height: 64rpx; line-height: 64rpx; text-align: center; background: var(--primary-light); color: var(--primary); font-size: 28rpx; font-weight: 600; border-radius: var(--radius-sm); }
.qty-input-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.qty-label { font-size: 28rpx; color: var(--text-secondary); }
.qty-input { flex: 1; height: 72rpx; border: 1.5rpx solid var(--border); border-radius: var(--radius-sm); padding: 0 20rpx; font-size: 36rpx; text-align: center; }
.qty-unit { font-size: 28rpx; color: var(--text-secondary); }
.qty-preview { font-size: 30rpx; color: var(--accent); font-weight: 600; margin-bottom: 16rpx; }
.submit-btn { width: 100%; height: 88rpx; line-height: 88rpx; text-align: center; background: var(--primary); color: #fff; font-size: 34rpx; font-weight: 600; border-radius: var(--radius-md); margin-top: 8rpx; border: none; }
.submit-btn[disabled] { opacity: 0.4; }
</style>
