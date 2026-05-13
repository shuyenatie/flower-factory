const db = wx.cloud.database()
const UNIT_HAND_PRICE = 0.008
const PIECES_PER_DOZEN = 12
const PIECES_PER_BASKET = 144

function pad(n) { return n < 10 ? '0' + n : n }

Page({
  data: {
    orderNo: '',
    clients: [],
    clientName: '',
    clientId: '',
    orderDate: '',
    returnDate: '',
    allProducts: [],
    filteredProducts: [],
    filteredDisplayNames: [],
    productItems: [],
    note: '',
    totalAmount: 0,
    totalAmountText: '0.00'
  },

  onLoad: function (options) {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate()
    const today = y + '-' + pad(m) + '-' + pad(d)

    this.setData({
      orderDate: today,
      productItems: [this.emptyItem()]
    })

    if (options.clientId) {
      this.setData({ clientId: options.clientId })
    }
  },

  emptyItem: function () {
    return {
      productId: '', productName: '', modelNo: '',
      handsPerPiece: '', dozenCount: '',
      pieceCount: 0, basketCount: 0, totalHands: 0, totalHandsText: '0', amount: 0,
      amountText: '0.00', displayName: ''
    }
  },

  onShow: function () {
    Promise.all([
      db.collection('clients').where({ active: true }).limit(100).get(),
      db.collection('products').where({ active: true }).limit(100).get()
    ]).then(results => {
      const clients = results[0].data
      const products = results[1].data

      this.setData({ allProducts: products, clients: clients })
      this.applyProductFilter()

      // 优先使用从上一页传入的 clientId
      if (this.data.clientId && clients.length > 0) {
        for (let i = 0; i < clients.length; i++) {
          if (clients[i]._id === this.data.clientId) {
            this.setData({
              clientIndex: i,
              clientName: clients[i].name,
              clientId: clients[i]._id
            })
            return
          }
        }
      }

      // 没有传入的 clientId 或未匹配到，使用第一个客户
      if (clients.length > 0 && !this.data.clientName) {
        const c = clients[0]
        this.setData({
          clientName: c.name,
          clientId: c._id
        })
      }
    }).catch(err => {
      console.error('加载数据失败', err)
    })
  },

  stopPropagation: function () {},

  applyProductFilter: function () {
    var orderNo = this.data.orderNo.trim()
    var products = this.data.allProducts
    var filtered, displayNames

    if (orderNo) {
      filtered = products.filter(function (p) {
        var nos = p.orderNos || []
        return nos.indexOf(orderNo) > -1
      })
    } else {
      filtered = products
    }

    displayNames = filtered.map(function (p) {
      return (p.modelNo ? p.modelNo + '-' : '') + p.name
    })

    this.setData({
      filteredProducts: filtered,
      filteredDisplayNames: displayNames
    })
  },

  onOrderNoInput: function (e) {
    this.setData({ orderNo: e.detail.value })
  },

  onOrderNoBlur: function () {
    this.applyProductFilter()
  },

  onOrderDateChange: function (e) {
    this.setData({ orderDate: e.detail.value })
  },

  onReturnDateChange: function (e) {
    this.setData({ returnDate: e.detail.value })
  },

  addProductItem: function () {
    var items = [...this.data.productItems]
    items.push(this.emptyItem())
    this.setData({ productItems: items })
  },

  removeProductItem: function (e) {
    var idx = e.currentTarget.dataset.index
    var items = [...this.data.productItems]
    if (items.length <= 1) return
    items.splice(idx, 1)
    this.setData({ productItems: items })
    this.recalcTotal()
  },

  onProductSelect: function (e) {
    var idx = e.currentTarget.dataset.index
    var pi = e.detail.value
    var items = [...this.data.productItems]
    var products = this.data.filteredProducts

    if (pi >= 0 && pi < products.length) {
      var p = products[pi]
      items[idx] = {
        productId: p._id,
        productName: p.name,
        modelNo: p.modelNo || '',
        handsPerPiece: String(p.defaultHandsPerPiece || ''),
        dozenCount: items[idx].dozenCount || '',
        pieceCount: 0, basketCount: 0, totalHands: 0, totalHandsText: '0', amount: 0,
        amountText: '0.00',
        displayName: (p.modelNo ? p.modelNo + '-' : '') + p.name
      }
    }
    this.setData({ productItems: items })
    this.recalcItem(idx)
  },

  onHandsPerPieceInput: function (e) {
    var idx = e.currentTarget.dataset.index
    var items = [...this.data.productItems]
    items[idx] = { ...items[idx], handsPerPiece: e.detail.value }
    this.setData({ productItems: items })
    this.recalcItem(idx)
  },

  onDozenCountInput: function (e) {
    var idx = e.currentTarget.dataset.index
    var items = [...this.data.productItems]
    items[idx] = { ...items[idx], dozenCount: e.detail.value }
    this.setData({ productItems: items })
    this.recalcItem(idx)
  },

  recalcItem: function (idx) {
    var items = [...this.data.productItems]
    var item = items[idx]
    var handsPerPiece = parseInt(item.handsPerPiece) || 0
    var dozen = parseInt(item.dozenCount) || 0
    var pieces = dozen * PIECES_PER_DOZEN
    var baskets = pieces / PIECES_PER_BASKET
    var totalHands = handsPerPiece * pieces
    var amount = totalHands * UNIT_HAND_PRICE

    item.pieceCount = pieces
    item.basketCount = baskets
    item.totalHands = totalHands
    item.totalHandsText = totalHands.toLocaleString()
    item.amount = amount
    item.amountText = amount.toFixed(2)

    this.setData({ productItems: items })
    this.recalcTotal()
  },

  recalcTotal: function () {
    var total = 0
    this.data.productItems.forEach(function (item) {
      total += item.amount
    })
    this.setData({ totalAmount: total, totalAmountText: total.toFixed(2) })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  saveOrder: function () {
    if (!this.data.orderNo.trim()) {
      wx.showToast({ title: '请输入单号', icon: 'none' })
      return
    }
    if (!this.data.clientId) {
      wx.showToast({ title: '请选择拿货商', icon: 'none' })
      return
    }
    if (!this.data.orderDate) {
      wx.showToast({ title: '请选择取材料日期', icon: 'none' })
      return
    }

    var validItems = this.data.productItems.filter(function (item) {
      return item.productId && parseInt(item.dozenCount) > 0
    })
    if (validItems.length === 0) {
      wx.showToast({ title: '请至少添加一个花型及数量', icon: 'none' })
      return
    }

    var productList = validItems.map(function (item) {
      return {
        productId: item.productId,
        productName: item.productName,
        modelNo: item.modelNo || '',
        handsPerPiece: parseInt(item.handsPerPiece) || 0,
        dozenCount: parseInt(item.dozenCount),
        pieceCount: item.pieceCount,
        basketCount: item.basketCount,
        totalHands: item.totalHands,
        unitHandPrice: UNIT_HAND_PRICE,
        amount: item.amount,
        displayName: item.displayName || item.productName
      }
    })

    wx.showLoading({ title: '保存中...' })

    var data = {
      orderNo: this.data.orderNo.trim(),
      clientId: this.data.clientId,
      clientName: this.data.clientName,
      orderDate: this.data.orderDate,
      returnDate: this.data.returnDate || '',
      actualReturnDate: '',
      productList: productList,
      processingFee: this.data.totalAmount,
      status: 'pending',
      note: this.data.note || '',
      createTime: db.serverDate()
    }

    db.collection('orders').add({ data: data }).then(function () {
      wx.hideLoading()
      wx.showToast({ title: '加工单创建成功' })
      wx.vibrateShort({ type: 'light' })
      wx.navigateBack()
    }).catch(function (err) {
      wx.hideLoading()
      console.error('创建加工单失败', err)
      wx.showToast({ title: '创建失败', icon: 'none' })
    })
  }
})
