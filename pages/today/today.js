const db = wx.cloud.database()

function getDateInfo(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const w = weekdays[date.getDay()]
  const dateStr = y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d)
  const display = y + '年' + m + '月' + d + '日 星期' + w
  return { dateStr, display }
}

Page({
  data: {
    currentDate: '',
    displayDate: '',
    groupedData: [],
    filteredGroupedData: [],
    searchText: '',
    totalCount: 0,
    totalAmount: '0.0',
    products: [],
    showEditSheet: false,
    editRecordId: '',
    editWorkerName: '',
    editProduct: null,
    editQuantity: '',
    editPreview: ''
  },

  onLoad: function () {
    const now = new Date()
    const info = getDateInfo(now)
    this.setData({
      currentDate: info.dateStr,
      displayDate: info.display
    })
    this.loadRecords()
    this.loadProducts()
  },

  onShow: function () {
    this.loadRecords()
    this.loadProducts()
  },

  loadProducts: function () {
    db.collection('products').where({ active: true }).limit(100).get().then(res => {
      this.setData({ products: res.data })
    }).catch(err => {
      console.error('加载花型失败', err)
    })
  },

  loadRecords: function () {
    db.collection('records').where({
      date: this.data.currentDate
    }).orderBy('createTime', 'desc').limit(100).get().then(res => {
      const raw = res.data
      const groups = {}

      raw.forEach(r => {
        const wid = r.workerId
        if (!groups[wid]) {
          groups[wid] = {
            workerId: wid,
            workerName: r.workerName,
            totalQuantity: 0,
            totalAmount: 0,
            amountText: '',
            expanded: false,
            records: []
          }
        }
        groups[wid].totalQuantity += r.quantity
        groups[wid].totalAmount += r.quantity * r.price
        groups[wid].records.push({
          _id: r._id,
          productId: r.productId,
          productName: r.productName,
          workerName: r.workerName,
          quantity: r.quantity,
          price: r.price,
          amount: r.quantity * r.price,
          amountText: (r.quantity * r.price).toFixed(1) + '元'
        })
      })

      const list = Object.keys(groups).map(function (wid) {
        const g = groups[wid]
        g.amountText = g.totalAmount.toFixed(1) + '元'
        // Merge records with same productId
        const merged = {}
        g.records.forEach(function (r) {
          if (!merged[r.productId]) {
            merged[r.productId] = {
              _id: r._id,
              productId: r.productId,
              productName: r.productName,
              workerName: r.workerName,
              quantity: 0,
              price: r.price,
              amount: 0,
              amountText: ''
            }
          }
          merged[r.productId].quantity += r.quantity
          merged[r.productId].amount += r.amount
        })
        g.records = Object.keys(merged).map(function (pid) {
          const m = merged[pid]
          m.amountText = m.amount.toFixed(1) + '元'
          return m
        })
        return g
      })

      list.sort(function (a, b) {
        return b.totalAmount - a.totalAmount
      })

      let allTotal = 0
      let allCount = 0
      list.forEach(function (g) {
        allTotal += g.totalAmount
        allCount += g.records.length
      })

      this.setData({
        groupedData: list,
        filteredGroupedData: list,
        totalCount: allCount,
        totalAmount: allTotal.toFixed(1)
      })
    }).catch(err => {
      console.error('加载记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onDateChange: function (e) {
    const date = new Date(e.detail.value)
    const info = getDateInfo(date)
    this.setData({
      currentDate: info.dateStr,
      displayDate: info.display
    })
    this.loadRecords()
  },

  onSearchInput: function (e) {
    const text = e.detail.value
    const filtered = this.data.groupedData.filter(function (g) {
      if (g.workerName.indexOf(text) > -1) return true
      return g.records.some(function (r) {
        return r.productName.indexOf(text) > -1
      })
    })
    this.setData({ searchText: text, filteredGroupedData: filtered })
  },

  toggleExpand: function (e) {
    const wid = e.currentTarget.dataset.id
    const list = this.data.groupedData
    for (let i = 0; i < list.length; i++) {
      if (list[i].workerId === wid) {
        list[i].expanded = !list[i].expanded
        break
      }
    }
    const filtered = this.data.filteredGroupedData
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].workerId === wid) {
        filtered[i].expanded = !filtered[i].expanded
        break
      }
    }
    this.setData({
      groupedData: list,
      filteredGroupedData: filtered
    })
  },

  stopPropagation: function () {},

  editRecord: function (e) {
    const item = e.currentTarget.dataset.item
    const product = this.data.products.find(function (p) {
      return p._id === item.productId
    })
    this.setData({
      showEditSheet: true,
      editRecordId: item._id,
      editWorkerName: item.workerName,
      editProduct: product || null,
      editQuantity: String(item.quantity),
      editPreview: item.amountText
    })
  },

  closeEditSheet: function () {
    this.setData({
      showEditSheet: false,
      editRecordId: '',
      editWorkerName: '',
      editProduct: null,
      editQuantity: '',
      editPreview: ''
    })
  },

  selectEditProduct: function (e) {
    const product = e.currentTarget.dataset.item
    const qty = this.data.editQuantity
    const num = parseInt(qty)
    const preview = !isNaN(num) && num > 0
      ? product.name + ' × ' + num + '件 = ' + (num * product.price).toFixed(1) + '元'
      : ''
    this.setData({
      editProduct: product,
      editPreview: preview
    })
  },

  onEditQuantityInput: function (e) {
    const qtyStr = e.detail.value
    const product = this.data.editProduct
    const num = parseInt(qtyStr)
    const preview = product && !isNaN(num) && num > 0
      ? product.name + ' × ' + num + '件 = ' + (num * product.price).toFixed(1) + '元'
      : ''
    this.setData({
      editQuantity: qtyStr,
      editPreview: preview
    })
  },

  setEditQuantity: function (e) {
    const qtyStr = String(e.currentTarget.dataset.val)
    const product = this.data.editProduct
    const num = parseInt(qtyStr)
    const preview = product && !isNaN(num) && num > 0
      ? product.name + ' × ' + num + '件 = ' + (num * product.price).toFixed(1) + '元'
      : ''
    this.setData({
      editQuantity: qtyStr,
      editPreview: preview
    })
  },

  saveEdit: function () {
    const id = this.data.editRecordId
    const product = this.data.editProduct
    const qty = parseInt(this.data.editQuantity)

    if (!product || !qty || qty <= 0) {
      wx.showToast({ title: '请选择花型并填写数量', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    db.collection('records').doc(id).update({
      data: {
        productId: product._id,
        productName: product.name,
        quantity: qty,
        price: product.price
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已修改' })
      wx.vibrateShort({ type: 'light' })
      this.setData({ showEditSheet: false })
      this.loadRecords()
    }).catch(err => {
      wx.hideLoading()
      console.error('修改失败', err)
      wx.showToast({ title: '修改失败', icon: 'none' })
    })
  },

  deleteRecord: function (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条记录？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          db.collection('records').doc(id).remove().then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除' })
            wx.vibrateShort({ type: 'light' })
            this.loadRecords()
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
