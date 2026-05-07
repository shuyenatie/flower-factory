const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    tab: 'pending',
    pendingOrders: [],
    completedOrders: [],
    pendingPage: 0,
    completedPage: 0,
    pendingMore: true,
    completedMore: true,
    pageSize: 20,
    showDeleteConfirm: false,
    deleteTargetId: '',
    deleteTargetName: ''
  },

  onShow: function () {
    this.setData({ pendingPage: 0, completedPage: 0, pendingOrders: [], completedOrders: [], pendingMore: true, completedMore: true })
    this.loadPending()
    this.loadCompleted()
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  loadPending: function () {
    if (!this.data.pendingMore) return
    const page = this.data.pendingPage
    db.collection('orders').where({ status: 'pending' }).orderBy('createTime', 'desc').skip(page * this.data.pageSize).limit(this.data.pageSize).get().then(res => {
      this.setData({
        pendingOrders: this.data.pendingOrders.concat(res.data),
        pendingPage: page + 1,
        pendingMore: res.data.length === this.data.pageSize
      })
    }).catch(err => {
      console.error('加载进行中订单失败', err)
      this.setData({ pendingMore: false })
    })
  },

  loadCompleted: function () {
    if (!this.data.completedMore) return
    const page = this.data.completedPage
    db.collection('orders').where({ status: 'completed' }).orderBy('createTime', 'desc').skip(page * this.data.pageSize).limit(this.data.pageSize).get().then(res => {
      this.setData({
        completedOrders: this.data.completedOrders.concat(res.data),
        completedPage: page + 1,
        completedMore: res.data.length === this.data.pageSize
      })
    }).catch(err => {
      console.error('加载已完成订单失败', err)
      this.setData({ completedMore: false })
    })
  },

  onScrollToLower: function () {
    if (this.data.tab === 'pending') {
      this.loadPending()
    } else {
      this.loadCompleted()
    }
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id })
  },

  goCreate: function () {
    wx.navigateTo({ url: '/pages/order-create/order-create' })
  },

  confirmDelete: function (e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    this.setData({
      showDeleteConfirm: true,
      deleteTargetId: id,
      deleteTargetName: name
    })
  },

  cancelDelete: function () {
    this.setData({ showDeleteConfirm: false })
  },

  doDelete: function () {
    const id = this.data.deleteTargetId
    wx.showLoading({ title: '删除中...' })
    db.collection('orders').doc(id).remove().then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已删除' })
      wx.vibrateShort({ type: 'light' })
      this.setData({
        showDeleteConfirm: false,
        pendingOrders: [],
        completedOrders: [],
        pendingPage: 0,
        completedPage: 0,
        pendingMore: true,
        completedMore: true
      })
      this.loadPending()
      this.loadCompleted()
    }).catch(err => {
      wx.hideLoading()
      console.error('删除失败', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  }
})
