<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">收入管理</text>
      <view class="header-btn" @tap="showAdd">+ 添加</view>
    </view>
    <view class="month-bar">
      <text class="month-btn" @tap="prevMonth">‹</text>
      <text class="month-text">{{ currentMonth }}</text>
      <text class="month-btn" @tap="nextMonth">›</text>
    </view>
    <scroll-view scroll-y class="list-scroll">
      <view class="card" v-for="item in list" :key="item._id" @longpress="deleteItem(item)">
        <view class="card-body">
          <text class="card-name">{{ item.clientName }}</text>
          <text class="card-amount">{{ (item.amount || 0).toFixed(2) }}元</text>
        </view>
        <text class="card-muted">{{ item.date }}{{ item.note ? ' · ' + item.note : '' }}</text>
      </view>
      <view class="empty" v-if="list.length === 0">暂无收入记录</view>
      <view class="bottom-space"></view>
    </scroll-view>

    <view class="overlay" v-if="showDialog" @tap="closeDialog">
      <view class="dialog" @tap.stop>
        <text class="dialog-title">添加收入</text>
        <input class="dialog-input" placeholder="客户/来源" v-model="formClient" />
        <input class="dialog-input" type="digit" placeholder="金额" v-model="formAmount" />
        <picker mode="date" :value="formDate" @change="onDateChange">
          <view class="dialog-input picker">{{ formDate }}</view>
        </picker>
        <input class="dialog-input" placeholder="备注（选填）" v-model="formNote" />
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @tap="closeDialog">取消</view>
          <view class="dialog-btn confirm" @tap="save">添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const list = ref([])
const currentMonth = ref('')
const year = ref(0), month = ref(0)
const showDialog = ref(false)
const formClient = ref('')
const formAmount = ref('')
const formDate = ref('')
const formNote = ref('')

function pad(n) { return n < 10 ? '0' + n : '' + n }

onShow(() => {
  const now = new Date(); year.value = now.getFullYear(); month.value = now.getMonth() + 1
  updateMonth(); load()
})

function updateMonth() { currentMonth.value = year.value + '年' + month.value + '月' }
function monthStr() { return year.value + '-' + pad(month.value) }

function load() { api.getIncomes(monthStr()).then(r => { list.value = r.data }) }

function prevMonth() { month.value--; if (month.value < 1) { month.value = 12; year.value-- }; updateMonth(); load() }
function nextMonth() { month.value++; if (month.value > 12) { month.value = 1; year.value++ }; updateMonth(); load() }

function showAdd() {
  const d = new Date(); formClient.value = ''; formAmount.value = ''
  formDate.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  formNote.value = ''; showDialog.value = true
}

function closeDialog() { showDialog.value = false }

function onDateChange(e) { formDate.value = e.detail.value }

function save() {
  if (!formClient.value.trim() || !formAmount.value) { uni.showToast({ title: '请填写完整', icon: 'none' }); return }
  uni.showLoading({ title: '保存中...' })
  api.addIncome({ clientName: formClient.value.trim(), amount: parseFloat(formAmount.value), date: formDate.value, note: formNote.value })
    .then(() => { uni.hideLoading(); uni.showToast({ title: '已保存' }); closeDialog(); load() })
    .catch(() => { uni.hideLoading(); uni.showToast({ title: '保存失败', icon: 'none' }) })
}

function deleteItem(item) {
  uni.showModal({ title: '删除', content: '确定删除这笔收入？',
    success: (res) => { if (res.confirm) api.deleteIncome(item._id).then(() => { uni.showToast({ title: '已删除' }); load() }) } })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.header-btn { font-size: 28rpx; color: var(--primary); font-weight: 600; padding: 8rpx 20rpx; background: var(--primary-light); border-radius: var(--radius-sm); }
.month-bar { display: flex; align-items: center; justify-content: center; gap: 20rpx; padding: 12rpx 0; }
.month-btn { font-size: 36rpx; color: var(--primary); padding: 8rpx; }
.month-text { font-size: 30rpx; font-weight: 600; color: var(--text); }
.list-scroll { padding: 8rpx 32rpx; }
.card { background: var(--surface); border-radius: var(--radius-md); padding: 24rpx; margin-bottom: 12rpx; box-shadow: var(--shadow-sm); }
.card-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6rpx; }
.card-name { font-size: 30rpx; font-weight: 600; color: var(--text); }
.card-amount { font-size: 30rpx; font-weight: 700; color: var(--green); }
.card-muted { font-size: 24rpx; color: var(--text-tertiary); }
.empty { text-align: center; padding: 80rpx; font-size: 30rpx; color: var(--text-tertiary); }
.bottom-space { height: 40rpx; }
.overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(31,26,22,0.4); z-index: 999; display: flex; align-items: center; justify-content: center; }
.dialog { width: 560rpx; background: var(--surface); border-radius: var(--radius-xl); padding: 40rpx; box-shadow: var(--shadow-xl); }
.dialog-title { font-size: 34rpx; font-weight: 700; color: var(--text); display: block; margin-bottom: 28rpx; }
.dialog-input { width: 100%; height: 72rpx; border: 1.5rpx solid var(--border); border-radius: var(--radius-sm); padding: 0 20rpx; font-size: 30rpx; box-sizing: border-box; margin-bottom: 16rpx; background: var(--bg); }
.dialog-input.picker { line-height: 72rpx; }
.dialog-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.dialog-btn { flex: 1; height: 72rpx; line-height: 72rpx; text-align: center; font-size: 30rpx; font-weight: 600; border-radius: var(--radius-md); }
.dialog-btn.cancel { background: var(--primary-light); color: var(--text-secondary); }
.dialog-btn.confirm { background: var(--primary); color: #fff; }
</style>
