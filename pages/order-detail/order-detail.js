const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    order: null,
    linkedRecords: [],
    allRecords: [],
    selectedRecordIds: [],
    showCompleteForm: false,
    actualReturnDate: '',
    processingFee: '',
    showLinkSheet: false,
    showDeleteConfirm: false,
    profitIncome: 0,
    profitCost: 0,
    profitAmount: 0
  },

  onLoad: function (options) {
    this.setData({ id: options.id }, function () {
      this.loadOrder()
    })
  },

  onShow: function () {
    if (this.data.order) {
      this.loadLinkedRecords()
    }
  },

  loadOrder: function () {
    const id = this.data.id
    if (!id) return

    db.collection('orders').doc(id).get().then(res => {
      const order = res.data
      if (order.productList) {
        order.productList.forEach(function (p) {
          if (p.pieceCount && p.handsPerPiece) {
            p.formulaText = p.handsPerPiece + '手×' + p.pieceCount + '枝÷144×1.152'
            p.amountText = p.amount ? p.amount.toFixed(2) : '0.00'
          } else {
            p.amountText = p.amount ? p.amount.toFixed(2) : '0.00'
          }
        })
      }
      this.setData({ order: order })

      const now = new Date()
      const orderDate = order.orderDate
      const endDate = order.actualReturnDate || (now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()))

      this.setData({ actualReturnDate: endDate })

      this.loadLinkedRecords()
    }).catch(err => {
      console.error('加载订单失败', err)
    })
  },

  loadLinkedRecords: function () {
    const id = this.data.id
    if (!id) return

    db.collection('order_records').where({ orderId: id }).limit(100).get().then(res => {
      const links = res.data
      const recordIds = links.map(function (l) { return l.recordId })

      if (recordIds.length === 0) {
        this.setData({ linkedRecords: [] })
        this.computeProfit()
        return
      }

      const tasks = []
      const batchSize = 20
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize)
        tasks.push(db.collection('records').where({ _id: _.in(batch) }).get())
      }

      Promise.all(tasks).then(function (results) {
        let records = []
        results.forEach(function (r) { records = records.concat(r.data) })
        records.forEach(function (r) { r.chargeText = (r.quantity * r.price).toFixed(1) + '元' })
        this.setData({ linkedRecords: records })
        this.computeProfit()
      }.bind(this)).catch(function (err) {
        console.error('加载关联记录失败', err)
      })
    }).catch(err => {
      console.error('加载关联关系失败', err)
      this.setData({ linkedRecords: [] })
    })
  },

  openCompleteForm: function () {
    const order = this.data.order
    if (order.status === 'completed') {
      wx.showToast({ title: '该订单已完成', icon: 'none' })
      return
    }
    const now = new Date()
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    this.setData({
      showCompleteForm: true,
      actualReturnDate: today,
      processingFee: String(order.processingFee || '')
    })
  },

  closeCompleteForm: function () {
    this.setData({ showCompleteForm: false })
  },

  stopPropagation: function () {},

  onActualReturnDateChange: function (e) {
    this.setData({ actualReturnDate: e.detail.value })
  },

  onFeeInput: function (e) {
    this.setData({ processingFee: e.detail.value })
  },

  markCompleted: function () {
    const date = this.data.actualReturnDate
    const fee = parseFloat(this.data.processingFee) || 0
    const order = this.data.order
    const self = this

    if (!date) {
      wx.showToast({ title: '请选择实际送回日期', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    db.collection('orders').doc(self.data.id).update({
      data: {
        status: 'completed',
        actualReturnDate: date,
        processingFee: fee
      }
    }).then(function () {
      return db.collection('incomes').add({
        data: {
          clientName: order.clientName,
          amount: fee,
          date: date,
          orderNo: order.orderNo || '',
          note: (order.orderNo ? '加工单 ' + order.orderNo : '加工单完工'),
          createTime: db.serverDate()
        }
      })
    }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '已标记完成，收入已记录' })
      wx.vibrateShort({ type: 'light' })
      self.setData({ showCompleteForm: false })
      self.loadOrder()
    }).catch(function (err) {
      wx.hideLoading()
      console.error('操作失败', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    })
  },

  openLinkSheet: function () {
    const order = this.data.order
    if (!order) return

    const orderDate = order.orderDate
    const now = new Date()
    const endDate = order.actualReturnDate || (now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()))
    const productIds = order.productList.map(function (p) { return p.productId })

    db.collection('records').where({
      date: _.gte(orderDate).and(_.lte(endDate)),
      productId: _.in(productIds)
    }).orderBy('date', 'desc').limit(100).get().then(function (res) {
      const linkedIds = this.data.linkedRecords.map(function (r) { return r._id })
      const available = res.data.filter(function (r) { return linkedIds.indexOf(r._id) === -1 })
      available.forEach(function (r) { r.chargeText = (r.quantity * r.price).toFixed(1) + '元'; r.isSelected = false })

      this.setData({
        allRecords: available,
        selectedRecordIds: [],
        showLinkSheet: true
      })
    }.bind(this)).catch(function (err) {
      console.error('加载可关联记录失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  closeLinkSheet: function () {
    this.setData({ showLinkSheet: false })
  },

  toggleRecordSelect: function (e) {
    const rid = e.currentTarget.dataset.id
    let records = this.data.allRecords
    for (let i = 0; i < records.length; i++) {
      if (records[i]._id === rid) {
        records[i].isSelected = !records[i].isSelected
        break
      }
    }
    let selected = []
    records.forEach(function (r) { if (r.isSelected) selected.push(r._id) })
    this.setData({ allRecords: records, selectedRecordIds: selected })
  },

  saveLinkRecords: function () {
    const ids = this.data.selectedRecordIds
    if (ids.length === 0) {
      wx.showToast({ title: '请选择要关联的记录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '关联中...' })
    const tasks = ids.map(function (rid) {
      return db.collection('order_records').add({
        data: {
          orderId: this.data.id,
          recordId: rid,
          createTime: db.serverDate()
        }
      })
    }.bind(this))

    Promise.all(tasks).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '已关联 ' + ids.length + ' 条记录' })
      wx.vibrateShort({ type: 'light' })
      this.setData({ showLinkSheet: false })
      this.loadLinkedRecords()
    }.bind(this)).catch(function (err) {
      wx.hideLoading()
      console.error('关联失败', err)
      wx.showToast({ title: '关联失败', icon: 'none' })
    })
  },

  showDeleteConfirm: function () {
    this.setData({ showDeleteConfirm: true })
  },

  cancelDelete: function () {
    this.setData({ showDeleteConfirm: false })
  },

  doDelete: function () {
    wx.showLoading({ title: '删除中...' })
    db.collection('orders').doc(this.data.id).remove().then(function () {
      return db.collection('order_records').where({ orderId: this.data.id }).remove()
    }.bind(this)).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '已删除' })
      wx.vibrateShort({ type: 'light' })
      wx.navigateBack()
    }).catch(function (err) {
      wx.hideLoading()
      console.error('删除失败', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  },

  goClientDetail: function () {
    wx.navigateTo({ url: '/pages/client-detail/client-detail?id=' + this.data.order.clientId })
  },

  computeProfit: function () {
    const order = this.data.order
    if (!order) return

    var income = 0
    if (order.processingFee && order.processingFee > 0) {
      income = order.processingFee
    } else {
      order.productList.forEach(function (p) {
        if (p.amount && p.amount > 0) {
          income += p.amount
        } else {
          income += (p.quantity || 0) * (p.unitPrice || 0)
        }
      })
    }

    var cost = 0
    this.data.linkedRecords.forEach(function (r) {
      cost += r.quantity * r.price
    })

    this.setData({
      profitIncome: income,
      profitCost: cost,
      profitAmount: income - cost
    })
  }
})

function pad(n) { return n < 10 ? '0' + n : n }
