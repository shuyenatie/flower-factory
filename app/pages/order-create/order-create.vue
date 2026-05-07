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
        <input class="input" placeholder="输入拿货商名称" v-model="clientName" />
      </view>
      <view class="field">
        <text class="label">取材料日期</text>
        <input class="input" type="text" placeholder="YYYY-MM-DD" v-model="orderDate" />
      </view>
      <view class="btn" @tap="save">保存</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../../api'

const orderNo = ref('')
const clientName = ref('')
const orderDate = ref('')

function save() {
  if (!orderNo.value || !clientName.value) {
    uni.showToast({ title: '请填写必填字段', icon: 'none' })
    return
  }
  uni.showToast({ title: '创建功能在开发中', icon: 'none' })
}
</script>

<style>
.page { min-height: 100vh; background: var(--bg); }
.header-bar { padding: 20rpx 32rpx; background: var(--surface); border-bottom: 1rpx solid var(--border-light); }
.header-title { font-size: 34rpx; font-weight: 700; color: var(--text); }
.form-scroll { padding: 24rpx 32rpx; }
.field { margin-bottom: 20rpx; }
.label { display: block; font-size: 28rpx; color: var(--text-secondary); margin-bottom: 8rpx; }
.input { width: 100%; height: 80rpx; border: 1.5rpx solid var(--border); border-radius: var(--radius-sm); padding: 0 24rpx; font-size: 32rpx; box-sizing: border-box; background: var(--surface); }
.btn { width: 100%; height: 88rpx; line-height: 88rpx; text-align: center; background: var(--primary); color: #fff; font-size: 34rpx; font-weight: 600; border-radius: var(--radius-md); margin-top: 40rpx; }
</style>
