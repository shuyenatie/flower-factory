<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">花型管理</text>
      <view class="header-btn" @tap="showAdd">+ 添加</view>
    </view>
    <scroll-view scroll-y class="list-scroll">
      <view class="search-bar">
        <input class="search-input" placeholder="搜索花型" v-model="kw" @input="onSearch" />
      </view>
      <view class="card" v-for="p in filtered" :key="p._id" @tap="showEdit(p)">
        <view class="card-body">
          <text class="card-name">{{ p.modelNo ? p.modelNo + '-' : '' }}{{ p.name }}</text>
          <text class="card-price">{{ p.price }}元/件</text>
        </view>
      </view>
      <view class="empty" v-if="filtered.length === 0">暂无花型，点击右上角添加</view>
      <view class="bottom-space"></view>
    </scroll-view>

    <view class="overlay" v-if="showDialog" @tap="closeDialog">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">{{ editing ? '编辑花型' : '添加花型' }}</text>
        <input class="dialog-input" placeholder="花型名称" v-model="formName" />
        <input class="dialog-input" placeholder="型号（选填）" v-model="formModelNo" />
        <input class="dialog-input" type="digit" placeholder="单价（元/件）" v-model="formPrice" />
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="closeDialog">取消</view>
          <view class="dialog-btn confirm" @tap="save">{{ editing ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const list = ref([])
const filtered = ref([])
const kw = ref('')
const showDialog = ref(false)
const editing = ref(false)
const editId = ref('')
const formName = ref('')
const formModelNo = ref('')
const formPrice = ref('')

onShow(() => { load() })

function load() {
  api.getProducts().then(r => { list.value = r.data; filtered.value = r.data })
}

function onSearch() {
  filtered.value = list.value.filter(p => (p.name + ' ' + (p.modelNo || '')).indexOf(kw.value) > -1)
}

function showAdd() {
  editing.value = false; editId.value = ''; formName.value = ''; formModelNo.value = ''; formPrice.value = ''
  showDialog.value = true
}

function showEdit(p) {
  editing.value = true; editId.value = p._id
  formName.value = p.name; formModelNo.value = p.modelNo || ''; formPrice.value = String(p.price || '')
  showDialog.value = true
}

function closeDialog() { showDialog.value = false }

function save() {
  if (!formName.value.trim()) { uni.showToast({ title: '请输入花型名称', icon: 'none' }); return }
  const price = parseFloat(formPrice.value)
  if (isNaN(price) || price <= 0) { uni.showToast({ title: '请输入有效单价', icon: 'none' }); return }
  uni.showLoading({ title: '保存中...' })
  const data = { name: formName.value.trim(), modelNo: formModelNo.value.trim(), price }
  const p = editing.value ? api.updateProduct(editId.value, data) : api.addProduct(data)
  p.then(() => { uni.hideLoading(); uni.showToast({ title: '已保存' }); closeDialog(); load() })
   .catch(() => { uni.hideLoading(); uni.showToast({ title: '保存失败', icon: 'none' }) })
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
.card-price { font-size: 28rpx; color: var(--accent); font-weight: 600; }
.empty { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
.bottom-space { height: 40rpx; }
.overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(31,26,22,0.4); z-index: 999; display: flex; align-items: center; justify-content: center; }
.dialog { width: 560rpx; background: var(--surface); border-radius: var(--radius-xl); padding: 40rpx; box-shadow: var(--shadow-xl); }
.dialog-title { font-size: 34rpx; font-weight: 700; color: var(--text); display: block; margin-bottom: 28rpx; }
.dialog-input { width: 100%; height: 72rpx; border: 1.5rpx solid var(--border); border-radius: var(--radius-sm); padding: 0 20rpx; font-size: 30rpx; box-sizing: border-box; margin-bottom: 16rpx; background: var(--bg); }
.dialog-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.dialog-btn { flex: 1; height: 72rpx; line-height: 72rpx; text-align: center; font-size: 30rpx; font-weight: 600; border-radius: var(--radius-md); }
.dialog-btn.cancel { background: var(--primary-light); color: var(--text-secondary); }
.dialog-btn.confirm { background: var(--primary); color: #fff; }
</style>
