const db = wx.cloud.database()

Page({
  data: {
    client: null,
    pendingOrders: [],
    completedOrders: [],
    tab: 'pending',
    editingId: '',
    showEditForm: false,
    editName: '',
    editPhone: '',
    editAddress: '',
    editNote: ''
  },

  onLoad: function (options) {
    this.setData({ editingId: options.id }, function () {
      this.loadData()
    })
  },

  loadData: function () {
    const id = this.data.editingId
    if (!id) return

    var self = this
    db.collection('clients').doc(id).get().then(function (res) {
      self.setData({ client: res.data })
    }).catch(function (err) {
      console.error('加载客户失败', err)
    })

    function safeOrdersQuery(status) {
      return db.collection('orders').where({ clientId: id, status: status }).orderBy('orderDate', 'desc').limit(100).get().then(function (res) {
        return res.data
      }).catch(function () {
        return []
      })
    }

    safeOrdersQuery('pending').then(function (orders) {
      self.setData({ pendingOrders: orders })
    })
    safeOrdersQuery('completed').then(function (orders) {
      self.setData({ completedOrders: orders })
    })
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  openEditForm: function () {
    const c = this.data.client
    this.setData({
      showEditForm: true,
      editName: c.name,
      editPhone: c.phone || '',
      editAddress: c.address || '',
      editNote: c.note || ''
    })
  },

  closeEditForm: function () {
    this.setData({ showEditForm: false })
  },

  stopPropagation: function () {},

  onEditNameInput: function (e) {
    this.setData({ editName: e.detail.value })
  },

  onEditPhoneInput: function (e) {
    this.setData({ editPhone: e.detail.value })
  },

  onEditAddressInput: function (e) {
    this.setData({ editAddress: e.detail.value })
  },

  onEditNoteInput: function (e) {
    this.setData({ editNote: e.detail.value })
  },

  saveEdit: function () {
    const name = this.data.editName.trim()
    if (!name) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    db.collection('clients').doc(this.data.editingId).update({
      data: {
        name: name,
        phone: this.data.editPhone.trim(),
        address: this.data.editAddress.trim(),
        note: this.data.editNote.trim()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已修改' })
      wx.vibrateShort({ type: 'light' })
      this.setData({ showEditForm: false })
      this.loadData()
    }).catch(err => {
      wx.hideLoading()
      console.error('修改失败', err)
      wx.showToast({ title: '修改失败', icon: 'none' })
    })
  },

  goOrderDetail: function (e) {
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + e.currentTarget.dataset.id })
  },

  goCreateOrder: function () {
    wx.navigateTo({ url: '/pages/order-create/order-create?clientId=' + this.data.editingId })
  }
})
