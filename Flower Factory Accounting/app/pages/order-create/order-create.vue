<template>
  <view class="page">
    <view class="header-bar">
      <text class="header-title">新建加工单</text>
    </view>
    <scroll-view scroll-y class="form-scroll">
      <view class="field">
        <text class="label">单号</text>
        <input class="input" placeholder="输入单号" v-model="orderNo" />
      </view>
      <view class="field">
        <text class="label">拿货商</text>
        <picker @change="onClientChange" :range="clients" range-key="name" :value="clientIndex">
          <view class="input picker">{{ clientName || '选择拿货商' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">取材料日期</text>
        <picker mode="date" :value="orderDate" @change="onDateChange">
          <view class="input picker">{{ orderDate || '选择日期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">备注（选填）</text>
        <input class="input" placeholder="备注" v-model="note" />
      </view>
      <view class="field" v-if="clients.length === 0">
        <text class="label hint">提示：请先在"拿货商"页面添加客户</text>
      </view>
      <view class="btn" @tap="save">创建加工单</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onShow } from 'vue'
import { api } from '../../api'

const orderNo = ref('')
const clientName = ref('')
const clientId = ref('')
const clients = ref([])
const clientIndex = ref(-1)
const orderDate = ref('')
const note = ref('')

onShow(() => {
  api.getClients().then(r => { clients.value = r.data })
  const d = new Date()
  orderDate.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
})

function onClientChange(e) {
  clientIndex.value = e.detail.value
  const c = clients.value[e.detail.value]
  if (c) { clientName.value = c.name; clientId.value = c._id }
}

function onDateChange(e) { orderDate.value = e.detail.value }

function save() {
  if (!clientId.value || !orderNo.value.trim() || !orderDate.value) {
    uni.showToast({ title: '请填写单号和拿货商', icon: 'none' }); return
  }
  uni.showLoading({ title: '创建中...' })
  api.addOrder({ clientId: clientId.value, clientName: clientName.value, orderNo: orderNo.value.trim(), orderDate: orderDate.value, note: note.value })
    .then(() => { uni.hideLoading(); uni.showToast({ title: '创建成功' }); uni.navigateBack() })
    .catch(() => { uni.hideLoading(); uni.showToast({ title: '创建失败', icon: 'none' }) })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.form-scroll { padding: 24rpx 32rpx; }
.field { margin-bottom: 20rpx; }
.label { display: block; font-size: 28rpx; color: var(--text-secondary); margin-bottom: 8rpx; }
.hint { color: var(--red); }
.input { width: 100%; height: 80rpx; border: 1.5rpx solid var(--border); border-radius: var(--radius-sm); padding: 0 24rpx; font-size: 32rpx; box-sizing: border-box; background: var(--surface); line-height: 80rpx; }
.input.picker { display: flex; align-items: center; }
.btn { width: 100%; height: 88rpx; line-height: 88rpx; text-align: center; background: var(--primary); color: #fff; font-size: 34rpx; font-weight: 600; border-radius: var(--radius-md); margin-top: 40rpx; }
</style>
