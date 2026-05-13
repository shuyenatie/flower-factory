const db = wx.cloud.database()
const PROCESSING_RATE = 0.0045
const SUPPLY_RATE = 0.008

Page({
  data: {
    products: [],
    filteredProducts: [],
    ordergroups: [],
    allOrderNos: [],
    orderNoCounts: {},
    currentOrderNo: '',
    searchText: '',
    isEditMode: false,
    checkedIds: [],
    checkedMap: {},
    hasChecked: false,
    showAddPopup: false,
    showOrderPopup: false,
    showEditPopup: false,
    newOrderInput: '',
    editProduct: null,
    newName: '',
    newModelNo: '',
    newHandsPerPiece: '',
    newPrice: '',
    newSupplyPrice: '',
    editName: '',
    editModelNo: '',
    editHandsPerPiece: '',
    editOrderNos: '',
    editPrice: '',
    editSupplyPrice: ''
  },

  onLoad: function () {
    this.loadAll()
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    var self = this
    db.collection('products').orderBy('createTime', 'desc').limit(100).get().then(function (res) {
      var products = res.data
      db.collection('ordergroups').orderBy('createTime', 'desc').limit(100).get().then(function (res2) {
        self.processData(products, res2.data)
      }).catch(function () {
        self.processData(products, [])
      })
    }).catch(function (err) {
      console.error('加载花型失败', err)
      self.setData({ products: [], filteredProducts: [] })
    })
  },

  processData: function (products, ordergroups) {
    var orderNoSet = {}
    var orderNoCounts = {}
    ordergroups.forEach(function (g) { orderNoSet[g.orderNo] = true })
    products.forEach(function (p) {
      ;(p.orderNos || []).forEach(function (no) {
        orderNoSet[no] = true
        orderNoCounts[no] = (orderNoCounts[no] || 0) + 1
      })
    })
    var allOrderNos = Object.keys(orderNoSet).sort()

    this.setData({ products: products, ordergroups: ordergroups, allOrderNos: allOrderNos, orderNoCounts: orderNoCounts })
    this.applyFilter()
  },

  applyFilter: function () {
    var searchText = this.data.searchText
    var currentOrderNo = this.data.currentOrderNo
    var products = this.data.products

    var filtered = products.filter(function (p) {
      if (currentOrderNo) {
        var nos = p.orderNos || []
        if (nos.indexOf(currentOrderNo) === -1) return false
      }
      if (searchText) {
        var kw = (p.modelNo || '') + ' ' + (p.name || '')
        if (kw.indexOf(searchText) === -1) return false
      }
      return true
    })

    this.setData({ filteredProducts: filtered })
  },

  onSearchInput: function (e) {
    this.setData({ searchText: e.detail.value }, this.applyFilter)
  },

  selectOrderNo: function (e) {
    var no = e.currentTarget.dataset.no
    this.setData({ currentOrderNo: no }, this.applyFilter)
  },

  stopPropagation: function () {},

  showAddPopup: function () {
    this.setData({ showAddPopup: true, newName: '', newModelNo: '', newHandsPerPiece: '', newPrice: '', newSupplyPrice: '' })
  },

  hideAddPopup: function () {
    this.setData({ showAddPopup: false, newName: '', newModelNo: '', newHandsPerPiece: '', newPrice: '', newSupplyPrice: '' })
  },

  onNameInput: function (e) {
    this.setData({ newName: e.detail.value })
  },

  onModelNoInput: function (e) {
    this.setData({ newModelNo: e.detail.value })
  },

  onHandsPerPieceInput: function (e) {
    const val = e.detail.value
    const hpp = parseFloat(val)
    if (!isNaN(hpp) && hpp > 0) {
      this.setData({
        newHandsPerPiece: val,
        newPrice: (hpp * PROCESSING_RATE).toFixed(2),
        newSupplyPrice: (hpp * SUPPLY_RATE).toFixed(2)
      })
    } else {
      this.setData({ newHandsPerPiece: val })
    }
  },

  onPriceInput: function (e) {
    this.setData({ newPrice: e.detail.value })
  },

  onSupplyPriceInput: function (e) {
    this.setData({ newSupplyPrice: e.detail.value })
  },

  addProduct: function () {
    var name = this.data.newName.trim()
    var modelNo = this.data.newModelNo.trim()
    var handsPerPiece = parseInt(this.data.newHandsPerPiece)
    var price = parseFloat(this.data.newPrice)
    var supplyPrice = parseFloat(this.data.newSupplyPrice)
    if (!name) { wx.showToast({ title: '请输入花型名称', icon: 'none' }); return }
    if (!modelNo) { wx.showToast({ title: '请输入型号', icon: 'none' }); return }
    if (isNaN(handsPerPiece) || handsPerPiece <= 0) { wx.showToast({ title: '请输入有效每枝手数', icon: 'none' }); return }
    if (isNaN(price) || price <= 0) { wx.showToast({ title: '请输入有效加工价', icon: 'none' }); return }

    var orderNos = []
    if (this.data.currentOrderNo) {
      orderNos = [this.data.currentOrderNo]
    }

    wx.showLoading({ title: '保存中...' })
    db.collection('products').add({
      data: {
        name: name,
        modelNo: modelNo,
        defaultHandsPerPiece: handsPerPiece,
        orderNos: orderNos,
        price: price,
        supplyPrice: isNaN(supplyPrice) ? 0 : supplyPrice,
        active: true,
        createTime: db.serverDate()
      }
    }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '添加成功' })
      this.hideAddPopup()
      this.loadAll()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      console.error('添加失败', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  showOrderPopup: function () {
    this.setData({ showOrderPopup: true, newOrderInput: '' })
  },

  hideOrderPopup: function () {
    this.setData({ showOrderPopup: false })
  },

  onNewOrderInput: function (e) {
    this.setData({ newOrderInput: e.detail.value })
  },

  addOrderGroup: function () {
    var no = this.data.newOrderInput.trim()
    if (!no) { wx.showToast({ title: '请输入单号', icon: 'none' }); return }

    wx.showLoading({ title: '保存中...' })
    db.collection('ordergroups').add({
      data: { orderNo: no, createTime: db.serverDate() }
    }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '单号已创建' })
      this.hideOrderPopup()
      this.loadAll()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      console.error('创建失败', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  },

  deleteOrderGroup: function (e) {
    var no = e.currentTarget.dataset.no
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定删除单号「' + no + '」？花型不会删除，仅移除单号标签。',
      success: function (res) {
        if (!res.confirm) return
        var targets = self.data.ordergroups.filter(function (g) { return g.orderNo === no })
        if (targets.length === 0) return
        wx.showLoading({ title: '删除中...' })
        var tasks = targets.map(function (g) { return db.collection('ordergroups').doc(g._id).remove() })
        Promise.all(tasks).then(function () {
          wx.hideLoading()
          wx.showToast({ title: '已删除' })
          self.loadAll()
        }).catch(function (err) {
          wx.hideLoading()
          console.error('删除失败', err)
        })
      }
    })
  },

  showEdit: function (e) {
    var p = e.currentTarget.dataset.item
    this.setData({
      showEditPopup: true,
      editProduct: p,
      editName: p.name || '',
      editModelNo: String(p.modelNo || ''),
      editHandsPerPiece: String(p.defaultHandsPerPiece || ''),
      editOrderNos: (p.orderNos || []).join(', '),
      editPrice: String(p.price || ''),
      editSupplyPrice: String(p.supplyPrice || '')
    })
  },

  hideEditPopup: function () {
    this.setData({ showEditPopup: false, editProduct: null })
  },

  onEditNameInput: function (e) { this.setData({ editName: e.detail.value }) },
  onEditModelNoInput: function (e) { this.setData({ editModelNo: e.detail.value }) },
  onEditHandsPerPieceInput: function (e) {
    const val = e.detail.value
    const hpp = parseFloat(val)
    if (!isNaN(hpp) && hpp > 0) {
      this.setData({
        editHandsPerPiece: val,
        editPrice: (hpp * PROCESSING_RATE).toFixed(2),
        editSupplyPrice: (hpp * SUPPLY_RATE).toFixed(2)
      })
    } else {
      this.setData({ editHandsPerPiece: val })
    }
  },
  onEditOrderNosInput: function (e) { this.setData({ editOrderNos: e.detail.value }) },
  onEditPriceInput: function (e) { this.setData({ editPrice: e.detail.value }) },
  onEditSupplyPriceInput: function (e) { this.setData({ editSupplyPrice: e.detail.value }) },

  saveProduct: function () {
    var name = this.data.editName.trim()
    var modelNo = this.data.editModelNo.trim()
    var handsPerPiece = parseInt(this.data.editHandsPerPiece)
    var price = parseFloat(this.data.editPrice)
    var supplyPrice = parseFloat(this.data.editSupplyPrice)
    if (!name) { wx.showToast({ title: '请输入花型名称', icon: 'none' }); return }
    if (!modelNo) { wx.showToast({ title: '请输入型号', icon: 'none' }); return }
    if (isNaN(handsPerPiece) || handsPerPiece <= 0) { wx.showToast({ title: '请输入有效每枝手数', icon: 'none' }); return }
    if (isNaN(price) || price <= 0) { wx.showToast({ title: '请输入有效加工价', icon: 'none' }); return }

    var orderNos = this.data.editOrderNos.split(',').map(function (s) { return s.trim() }).filter(function (s) { return s })

    wx.showLoading({ title: '保存中...' })
    db.collection('products').doc(this.data.editProduct._id).update({
      data: {
        name: name,
        modelNo: modelNo,
        defaultHandsPerPiece: handsPerPiece,
        orderNos: orderNos,
        price: price,
        supplyPrice: isNaN(supplyPrice) ? 0 : supplyPrice
      }
    }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '已更新' })
      this.hideEditPopup()
      this.loadAll()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      console.error('更新失败', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    })
  },

  clearAllData: function () {
    var self = this
    wx.showModal({
      title: '清空所有数据',
      content: '确定删除所有花型和单号？此操作不可恢复！',
      success: function (res) {
        if (!res.confirm) return
        wx.showLoading({ title: '清空中...' })
        wx.cloud.callFunction({ name: 'clearProducts' }).then(function (r) {
          wx.hideLoading()
          wx.showToast({ title: '已清空 ' + (r.result.products + r.result.ordergroups) + ' 条' })
          self.loadAll()
        }).catch(function (err) {
          wx.hideLoading()
          console.error('清空失败', err)
          wx.showToast({ title: '清空失败，请在微信开发者工具部署 clearProducts 云函数', icon: 'none' })
        })
      }
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
    var id = e.currentTarget.dataset.id
    var map = this.data.checkedMap
    var checked = this.data.checkedIds
    if (map[id]) {
      delete map[id]
      var idx = checked.indexOf(id)
      if (idx > -1) checked.splice(idx, 1)
    } else {
      map[id] = true
      checked.push(id)
    }
    this.setData({ checkedMap: map, checkedIds: checked, hasChecked: checked.length > 0 })
  },

  deleteSelected: function () {
    var ids = this.data.checkedIds
    if (ids.length === 0) return
    wx.showModal({
      title: '确认删除',
      content: '确定删除选中的 ' + ids.length + ' 个花型？',
      success: function (res) {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        var promises = ids.map(function (id) { return db.collection('products').doc(id).remove() })
        Promise.all(promises).then(function () {
          wx.hideLoading()
          wx.showToast({ title: '删除成功' })
          this.setData({ isEditMode: false, checkedIds: [], checkedMap: {}, hasChecked: false })
          this.loadAll()
        }.bind(this)).catch(function (err) {
          wx.hideLoading()
          console.error('删除失败', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }.bind(this)
    })
  }
})
