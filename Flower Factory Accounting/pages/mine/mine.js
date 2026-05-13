const db = wx.cloud.database()

Page({
  data: {
    year: 0,
    month: 0,
    yearMonth: '',
    startYear: 0,
    yearRange: [],
    monthRange: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    yearIndex: 0,
    monthIndex: 0,
    workersData: [],
    filteredWorkerData: [],
    searchText: '',
    totalAmount: '0.0',
    hasData: false,
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
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const startYear = y - 5

    const years = []
    for (let i = startYear; i <= y + 5; i++) {
      years.push(i + '年')
    }

    this.setData({
      startYear: startYear,
      year: y,
      month: m,
      yearRange: years,
      yearIndex: y - startYear,
      monthIndex: m - 1
    })
    this.updateTitle()
    this.loadData()
    this.loadProducts()
  },

  onShow: function () {
    this.loadData()
    this.loadProducts()
  },

  updateTitle: function () {
    this.setData({
      yearMonth: this.data.year + '年' + this.data.month + '月'
    })
  },

  getLastDay: function (y, m) {
    return new Date(y, m, 0).getDate()
  },

  loadData: function () {
    const y = this.data.year
    const m = this.data.month
    const lastDay = this.getLastDay(y, m)
    const pad = function (n) { return n < 10 ? '0' + n : n }
    const startDate = y + '-' + pad(m) + '-01'
    const endDate = y + '-' + pad(m) + '-' + pad(lastDay)

    db.collection('records').where({
      date: db.command.gte(startDate).and(db.command.lte(endDate))
    }).orderBy('date', 'asc').limit(100).get().then(res => {
      this.processRecords(res.data)
    }).catch(err => {
      console.error('加载失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  processRecords: function (records) {
    const groups = {}
    records.forEach(r => {
      const id = r.workerId
      if (!groups[id]) {
        groups[id] = {
          workerId: id,
          workerName: r.workerName,
          totalQuantity: 0,
          totalAmount: 0,
          amountText: '',
          expanded: false,
          records: []
        }
      }
      groups[id].totalQuantity += r.quantity
      groups[id].totalAmount += r.quantity * r.price
      groups[id].records.push({
        _id: r._id,
        productId: r.productId,
        productName: r.productName,
        quantity: r.quantity,
        price: r.price,
        amount: r.quantity * r.price,
        amountText: (r.quantity * r.price).toFixed(1) + '元'
      })
    })

    const list = []
    let allTotal = 0
    Object.keys(groups).forEach(function (id) {
      const g = groups[id]
      // Merge records with same productId
      const merged = {}
      g.records.forEach(function (r) {
        const key = r.productId || r.productName
        if (!merged[key]) {
          merged[key] = {
            _id: r._id,
            productId: r.productId,
            productName: r.productName,
            quantity: 0,
            price: r.price,
            amount: 0,
            amountText: ''
          }
        }
        merged[key].quantity += r.quantity
        merged[key].amount += r.amount
      })
      g.records = Object.keys(merged).map(function (key) {
        const m = merged[key]
        m.amountText = m.amount.toFixed(1) + '元'
        return m
      })
      g.amountText = g.totalAmount.toFixed(1) + '元'
      allTotal += g.totalAmount
      list.push(g)
    })

    list.sort(function (a, b) {
      return b.totalAmount - a.totalAmount
    })

    this.setData({
      workersData: list,
      filteredWorkerData: list,
      totalAmount: allTotal.toFixed(1),
      hasData: list.length > 0
    })
  },

  prevMonth: function () {
    let y = this.data.year
    let m = this.data.month - 1
    if (m < 1) { m = 12; y-- }
    this.setData({
      year: y,
      month: m,
      monthIndex: m - 1,
      yearIndex: y - this.data.startYear
    })
    this.updateTitle()
    this.loadData()
  },

  nextMonth: function () {
    let y = this.data.year
    let m = this.data.month + 1
    if (m > 12) { m = 1; y++ }
    this.setData({
      year: y,
      month: m,
      monthIndex: m - 1,
      yearIndex: y - this.data.startYear
    })
    this.updateTitle()
    this.loadData()
  },

  onYearChange: function (e) {
    const idx = e.detail.value
    const year = parseInt(this.data.yearRange[idx])
    this.setData({ year: year, yearIndex: idx })
    this.updateTitle()
    this.loadData()
  },

  onMonthChange: function (e) {
    const idx = e.detail.value
    this.setData({ month: idx + 1, monthIndex: idx })
    this.updateTitle()
    this.loadData()
  },

  toggleExpand: function (e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.workersData
    for (let i = 0; i < list.length; i++) {
      if (list[i].workerId === id) {
        list[i].expanded = !list[i].expanded
        break
      }
    }
    this.setData({ workersData: list, filteredWorkerData: this.data.filteredWorkerData })
  },

  loadProducts: function () {
    db.collection('products').where({ active: true }).limit(100).get().then(res => {
      this.setData({ products: res.data })
    }).catch(err => {
      console.error('加载花型失败', err)
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
      this.loadData()
    }).catch(err => {
      wx.hideLoading()
      console.error('修改失败', err)
      wx.showToast({ title: '修改失败', icon: 'none' })
    })
  },

  onSearchInput: function (e) {
    const text = e.detail.value
    const filtered = this.data.workersData.filter(function (w) {
      return w.workerName.indexOf(text) > -1
    })
    this.setData({ searchText: text, filteredWorkerData: filtered })
  },

  copySummary: function () {
    let text = this.data.yearMonth + '工资汇总：\n'
    this.data.workersData.forEach(w => {
      text += w.workerName + '：共计' + w.totalQuantity + '件，工资 ' + w.amountText + '\n'
    })

    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({ title: '已复制到剪贴板' })
      }
    })
  },

  goWorkers: function () {
    wx.navigateTo({ url: '/pages/workers/workers' })
  },

  goProducts: function () {
    wx.navigateTo({ url: '/pages/products/products' })
  },

  goIncome: function () {
    wx.navigateTo({ url: '/pages/income/income' })
  },

  goExpense: function () {
    wx.navigateTo({ url: '/pages/expense/expense' })
  },

  goClients: function () {
    wx.navigateTo({ url: '/pages/clients/clients' })
  },

  goOrders: function () {
    wx.navigateTo({ url: '/pages/orders/orders' })
  },

  exportExcel: function () {
    const self = this
    const y = this.data.year
    const m = this.data.month
    const workers = this.data.workersData.map(function (w) {
      return {
        workerName: w.workerName,
        totalQuantity: w.totalQuantity,
        totalAmount: w.totalAmount
      }
    })

    if (workers.length === 0) {
      wx.showToast({ title: '没有数据可导出', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成中...' })

    db.collection('workers').limit(100).get().then(function (workerList) {
      const workerMap = {}
      workerList.data.forEach(function (wrk) {
        workerMap[wrk.name] = wrk
      })

      const enriched = workers.map(function (w) {
        const info = workerMap[w.workerName] || {}
        return {
          workerName: w.workerName,
          phone: info.phone || '',
          idNumber: info.idNumber || '',
          totalQuantity: w.totalQuantity,
          totalAmount: w.totalAmount
        }
      })

      wx.cloud.callFunction({
        name: 'exportSalary',
        data: { year: y, month: m, workers: enriched }
      }).then(function (res) {
        const base64 = res.result.base64
        const fileName = res.result.fileName
        const fs = wx.getFileSystemManager()
        const filePath = wx.env.USER_DATA_PATH + '/' + fileName

        fs.writeFile({
          filePath: filePath,
          data: base64,
          encoding: 'base64',
          success: function () {
            wx.hideLoading()
            wx.openDocument({
              filePath: filePath,
              showMenu: true,
              success: function () {},
              fail: function () {
                wx.shareFileMessage({
                  filePath: filePath,
                  fileName: fileName,
                  fail: function () {
                    wx.showToast({ title: '打开失败', icon: 'none' })
                  }
                })
              }
            })
          },
          fail: function (err) {
            wx.hideLoading()
            console.error('文件写入失败', err)
            wx.showToast({ title: '正在尝试 CSV...', icon: 'none' })
            self.exportCSV(y, m, enriched)
          }
        })
      }).catch(function (err) {
        wx.hideLoading()
        console.error('云函数调用失败', err)
        wx.showToast({ title: '正在尝试 CSV...', icon: 'none' })
        self.exportCSV(y, m, enriched)
      })
    })
  },

  exportCSV: function (y, m, workers) {
    let csv = '\uFEFF姓名,手机号,身份证号,总件数,工资总额（元）\n'
    workers.forEach(function (w) {
      csv += w.workerName + ',' + (w.phone || '') + ',' + (w.idNumber || '') + ',' + w.totalQuantity + ',' + w.totalAmount.toFixed(2) + '\n'
    })

    const fileName = y + '年' + m + '月工资表.csv'
    const fs = wx.getFileSystemManager()
    const filePath = wx.env.USER_DATA_PATH + '/' + fileName

    fs.writeFile({
      filePath: filePath,
      data: csv,
      encoding: 'utf8',
      success: function () {
        wx.hideLoading()
        wx.shareFileMessage({
          filePath: filePath,
          fileName: fileName,
          fail: function () {
            wx.showToast({ title: '导出失败', icon: 'none' })
          }
        })
      },
      fail: function (err) {
        wx.hideLoading()
        console.error('CSV写入失败', err)
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  }
})
