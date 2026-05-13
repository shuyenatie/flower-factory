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
    workers: [],
    filteredWorkers: [],
    searchText: '',
    products: [],
    filteredProducts: [],
    productSearchText: '',
    showSheet: false,
    selectedWorker: null,
    selectedProduct: null,
    quantity: '',
    canSubmit: false,
    previewText: '',
    workersEmpty: true,
    noProductSelected: true,
    autoFocus: false,
    summaryWorkerCount: 0,
    summaryDayCount: 0,
    summaryTotalQty: 0,
    summaryTotalAmount: '0.0',
    taxDetails: [],
    totalTax: '0.00'
  },

  onLoad: function () {
    const now = new Date()
    const info = getDateInfo(now)
    this.setData({
      currentDate: info.dateStr,
      displayDate: info.display
    })
    this.loadData()
    this.loadMonthSummary()
  },

  onShow: function () {
    this.loadData()
    this.loadMonthSummary()
  },

  loadData: function () {
    Promise.all([
      db.collection('workers').where({ active: true }).limit(100).get(),
      db.collection('products').where({ active: true }).limit(100).get()
    ]).then(results => {
      const workers = results[0].data
      const products = results[1].data
      const searchText = this.data.searchText
      const filtered = searchText ? workers.filter(function (w) { return w.name.indexOf(searchText) > -1 }) : workers
      this.setData({
        workers: workers,
        filteredWorkers: filtered,
        products: products,
        filteredProducts: products,
        workersEmpty: workers.length === 0
      })
    }).catch(err => {
      console.error('加载数据失败', err)
    })
  },

  loadMonthSummary: function () {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const lastDay = new Date(y, m, 0).getDate()
    const pad = function (n) { return n < 10 ? '0' + n : n }
    const start = y + '-' + pad(m) + '-01'
    const end = y + '-' + pad(m) + '-' + pad(lastDay)

    const _ = db.command
    db.collection('records').where({
      date: _.gte(start).and(_.lte(end))
    }).limit(100).get().then(res => {
      const records = res.data
      const workerSet = new Set(), daySet = new Set()
      let totalQty = 0, totalAmount = 0
      records.forEach(r => {
        workerSet.add(r.workerId)
        daySet.add(r.date)
        totalQty += r.quantity
        totalAmount += r.quantity * r.price
      })

      const workerIncome = {}
      records.forEach(r => {
        if (!workerIncome[r.workerName]) {
          workerIncome[r.workerName] = { total: 0 }
        }
        workerIncome[r.workerName].total += r.quantity * r.price
      })

      const taxDetails = []
      let totalTax = 0
      Object.keys(workerIncome).forEach(name => {
        const income = workerIncome[name].total
        let tax = 0
        if (income > 800) {
          if (income <= 4000) {
            tax = (income - 800) * 0.2
          } else {
            tax = income * 0.8 * 0.2
          }
        }
        tax = Math.round(tax * 100) / 100
        totalTax += tax
        if (tax > 0) {
          taxDetails.push({ name: name, income: income.toFixed(1), tax: tax.toFixed(2) })
        }
      })

      this.setData({
        summaryWorkerCount: workerSet.size,
        summaryDayCount: daySet.size,
        summaryTotalQty: totalQty,
        summaryTotalAmount: totalAmount.toFixed(1),
        taxDetails: taxDetails,
        totalTax: totalTax.toFixed(2)
      })
    }).catch(err => {
      console.error('加载月度汇总失败', err)
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

  onProductSearchInput: function (e) {
    const text = e.detail.value
    const filtered = this.data.products.filter(function (p) {
      return (p.name + ' ' + (p.modelNo || '')).indexOf(text) > -1
    })
    this.setData({ productSearchText: text, filteredProducts: filtered })
  },

  onDateChange: function (e) {
    const date = new Date(e.detail.value)
    const info = getDateInfo(date)
    this.setData({
      currentDate: info.dateStr,
      displayDate: info.display
    })
  },

  selectWorker: function (e) {
    this.setData({
      showSheet: true,
      selectedWorker: e.currentTarget.dataset.item,
      selectedProduct: null,
      noProductSelected: true,
      quantity: '',
      canSubmit: false,
      previewText: ''
    })
  },

  closeSheet: function () {
    this.setData({
      showSheet: false,
      selectedWorker: null,
      selectedProduct: null,
      noProductSelected: true,
      quantity: '',
      canSubmit: false,
      previewText: ''
    })
  },

  selectProduct: function (e) {
    const product = e.currentTarget.dataset.item
    this.setData({
      selectedProduct: product,
      noProductSelected: false,
      quantity: '',
      canSubmit: false,
      previewText: '',
      autoFocus: false
    }, function () {
      this.setData({ autoFocus: true })
    })
  },

  onQuantityInput: function (e) {
    this.updatePreview(e.detail.value)
  },

  setQuantity: function (e) {
    this.updatePreview(String(e.currentTarget.dataset.val))
  },

  updatePreview: function (qtyStr) {
    const product = this.data.selectedProduct
    const num = parseInt(qtyStr)
    const valid = !isNaN(num) && num > 0
    let preview = ''
    if (valid && product) {
      preview = product.name + ' × ' + num + '件 = ' + (num * product.price).toFixed(1) + '元'
    }
    this.setData({
      quantity: qtyStr,
      canSubmit: valid,
      previewText: preview
    })
  },

  submitRecord: function () {
    const worker = this.data.selectedWorker
    const product = this.data.selectedProduct
    const qty = parseInt(this.data.quantity)
    const date = this.data.currentDate

    if (!product || !qty || qty <= 0) return

    wx.showLoading({ title: '保存中...' })

    db.collection('records').add({
      data: {
        workerId: worker._id,
        productId: product._id,
        workerName: worker.name,
        productName: product.name,
        quantity: qty,
        price: product.price,
        date: date,
        createTime: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已记录' })
      wx.vibrateShort({ type: 'light' })
      this.closeSheet()
    }).catch(err => {
      wx.hideLoading()
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  goClients: function () {
    wx.navigateTo({ url: '/pages/clients/clients' })
  },

  goOrders: function () {
    wx.navigateTo({ url: '/pages/orders/orders' })
  },

  goMine: function () {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  goWorkers: function () {
    wx.navigateTo({ url: '/pages/workers/workers' })
  },

  goProducts: function () {
    wx.navigateTo({ url: '/pages/products/products' })
  }
})
