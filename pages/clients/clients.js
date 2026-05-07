const db = wx.cloud.database()

Page({
  data: {
    clients: [],
    showForm: false,
    formName: '',
    formPhone: '',
    formAddress: '',
    formNote: '',
    editingId: '',
    showDeleteConfirm: false,
    deleteTargetId: '',
    deleteTargetName: ''
  },

  onLoad: function () {
    this.loadClients()
  },

  onShow: function () {
    this.loadClients()
  },

  loadClients: function () {
    db.collection('clients').orderBy('createTime', 'desc').limit(100).get().then(res => {
      this.setData({ clients: res.data })
    }).catch(err => {
      console.error('加载客户失败', err)
    })
  },

  openAddForm: function () {
    this.setData({
      showForm: true,
      editingId: '',
      formName: '',
      formPhone: '',
      formAddress: '',
      formNote: ''
    })
  },

  closeForm: function () {
    this.setData({ showForm: false })
  },

  stopPropagation: function () {},

  onNameInput: function (e) {
    this.setData({ formName: e.detail.value })
  },

  onPhoneInput: function (e) {
    this.setData({ formPhone: e.detail.value })
  },

  onAddressInput: function (e) {
    this.setData({ formAddress: e.detail.value })
  },

  onNoteInput: function (e) {
    this.setData({ formNote: e.detail.value })
  },

  saveClient: function () {
    const name = this.data.formName.trim()
    if (!name) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }

    const data = {
      name: name,
      phone: this.data.formPhone.trim(),
      address: this.data.formAddress.trim(),
      note: this.data.formNote.trim(),
      active: true
    }

    wx.showLoading({ title: '保存中...' })

    if (this.data.editingId) {
      db.collection('clients').doc(this.data.editingId).update({ data }).then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已修改' })
        wx.vibrateShort({ type: 'light' })
        this.closeForm()
        this.loadClients()
      }).catch(err => {
        wx.hideLoading()
        console.error('修改失败', err)
        wx.showToast({ title: '修改失败', icon: 'none' })
      })
    } else {
      data.createTime = db.serverDate()
      db.collection('clients').add({ data }).then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已添加' })
        wx.vibrateShort({ type: 'light' })
        this.closeForm()
        this.loadClients()
      }).catch(err => {
        wx.hideLoading()
        console.error('添加失败', err)
        wx.showToast({ title: '添加失败', icon: 'none' })
      })
    }
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

  doDelete: function () {
    const id = this.data.deleteTargetId
    wx.showLoading({ title: '删除中...' })
    db.collection('clients').doc(id).remove().then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已删除' })
      wx.vibrateShort({ type: 'light' })
      this.setData({ showDeleteConfirm: false })
      this.loadClients()
    }).catch(err => {
      wx.hideLoading()
      console.error('操作失败', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  },

  cancelDelete: function () {
    this.setData({ showDeleteConfirm: false })
  },

  goDetail: function (e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/client-detail/client-detail?id=' + id })
  }
})
