const db = wx.cloud.database()

Page({
  data: {
    workers: [],
    filteredWorkers: [],
    searchText: '',
    isEditMode: false,
    checkedIds: [],
    showAddPopup: false,
    newName: '',
    newPhone: '',
    newIdNumber: '',
    hasChecked: false,
    showEditPopup: false,
    editWorkerId: '',
    editName: '',
    editPhone: '',
    editIdNumber: ''
  },

  onLoad: function () {
    this.loadWorkers()
  },

  onShow: function () {
    this.loadWorkers()
  },

  loadWorkers: function () {
    db.collection('workers').orderBy('createTime', 'desc').limit(100).get().then(res => {
      const workers = res.data
      this.setData({ workers: workers, filteredWorkers: workers })
    }).catch(err => {
      console.error('加载工人失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  stopPropagation: function () {},

  onSearchInput: function (e) {
    const text = e.detail.value
    const filtered = this.data.workers.filter(function (w) {
      return w.name.indexOf(text) > -1
    })
    this.setData({ searchText: text, filteredWorkers: filtered })
  },

  showAddPopup: function () {
    this.setData({ showAddPopup: true, newName: '', newPhone: '', newIdNumber: '' })
  },

  hideAddPopup: function () {
    this.setData({ showAddPopup: false, newName: '', newPhone: '', newIdNumber: '' })
  },

  onNameInput: function (e) {
    this.setData({ newName: e.detail.value })
  },

  onPhoneInput: function (e) {
    this.setData({ newPhone: e.detail.value })
  },

  onIdNumberInput: function (e) {
    this.setData({ newIdNumber: e.detail.value })
  },

  addWorker: function () {
    const name = this.data.newName.trim()
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中...' })
    db.collection('workers').add({
      data: {
        name: name,
        phone: this.data.newPhone.trim(),
        idNumber: this.data.newIdNumber.trim(),
        active: true,
        createTime: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加成功' })
      this.hideAddPopup()
      this.loadWorkers()
    }).catch(err => {
      wx.hideLoading()
      console.error('添加失败', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  toggleEditMode: function () {
    this.setData({
      isEditMode: !this.data.isEditMode,
      checkedIds: [],
      checkedMap: {},
      hasChecked: false
    })
  },

  toggleCheck: function (e) {
    const id = e.currentTarget.dataset.id
    const map = this.data.checkedMap
    const checked = this.data.checkedIds
    if (map[id]) {
      delete map[id]
      const idx = checked.indexOf(id)
      if (idx > -1) checked.splice(idx, 1)
    } else {
      map[id] = true
      checked.push(id)
    }
    this.setData({ checkedMap: map, checkedIds: checked, hasChecked: checked.length > 0 })
  },

  showEdit: function (e) {
    var w = e.currentTarget.dataset.item
    this.setData({
      showEditPopup: true,
      editWorkerId: w._id,
      editName: w.name || '',
      editPhone: w.phone || '',
      editIdNumber: w.idNumber || ''
    })
  },

  hideEditPopup: function () {
    this.setData({ showEditPopup: false, editWorkerId: '' })
  },

  onEditNameInput: function (e) { this.setData({ editName: e.detail.value }) },
  onEditPhoneInput: function (e) { this.setData({ editPhone: e.detail.value }) },
  onEditIdNumberInput: function (e) { this.setData({ editIdNumber: e.detail.value }) },

  saveWorker: function () {
    var name = this.data.editName.trim()
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中...' })
    db.collection('workers').doc(this.data.editWorkerId).update({
      data: {
        name: name,
        phone: this.data.editPhone.trim(),
        idNumber: this.data.editIdNumber.trim()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已更新' })
      this.hideEditPopup()
      this.loadWorkers()
    }).catch(err => {
      wx.hideLoading()
      console.error('更新失败', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    })
  },

  deleteSelected: function () {
    const ids = this.data.checkedIds
    if (ids.length === 0) return
    wx.showModal({
      title: '确认删除',
      content: '确定删除选中的 ' + ids.length + ' 个工人？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          const promises = ids.map(id => db.collection('workers').doc(id).remove())
          Promise.all(promises).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
            this.setData({ isEditMode: false, checkedIds: [], checkedMap: {}, hasChecked: false })
            this.loadWorkers()
          }).catch(err => {
            wx.hideLoading()
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  }
})
