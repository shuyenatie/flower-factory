const db = wx.cloud.database()

function pad(n) { return n < 10 ? '0' + n : '' + n }

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function monthStr(dateStr) {
  return dateStr.slice(0, 7)
}

Page({
  data: {
    list: [],
    monthTotal: '0.00',
    showForm: false,
    categoryRange: ['房租', '水电', '工具耗材', '送货路费', '其他'],
    form: { categoryIndex: 0, amount: '', date: todayStr(), note: '' },
    currentMonth: monthStr(todayStr()),
    loading: true
  },

  _touchItemId: null,
  _touchStartX: 0,
  _isSwiping: false,

  onLoad: function () {
    this.loadAll()
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    this.setData({ loading: true })
    db.collection('expenses').orderBy('date', 'desc').orderBy('createTime', 'desc').limit(100).get().then(res => {
      const raw = res.data
      const list = raw.map(r => ({
        _id: r._id,
        category: r.category || '',
        amount: r.amount || 0,
        amountText: (r.amount || 0).toFixed(2),
        note: r.note || '',
        date: r.date || '',
        swipeX: 0
      }))
      this.setData({
        list: list,
        loading: false
      })
      this.calcMonthTotal()
    }).catch(err => {
      console.error('加载支出记录失败', err)
      this.setData({ loading: false })
      if (err.errCode === -502005) {
        wx.showToast({ title: '数据库集合 "expenses" 不存在', icon: 'none', duration: 3000 })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  calcMonthTotal: function () {
    const cm = this.data.currentMonth
    let total = 0
    this.data.list.forEach(item => {
      if (item.date && item.date.slice(0, 7) === cm) {
        total += item.amount
      }
    })
    this.setData({ monthTotal: total.toFixed(2) })
  },

  touchStart: function (e) {
    const list = this.data.list
    list.forEach((item, idx) => {
      if (item.swipeX && item.swipeX !== 0) {
        this.setData({ ['list[' + idx + '].swipeX']: 0 })
      }
    })
    this._touchItemId = e.currentTarget.dataset.id
    this._touchStartX = e.touches[0].clientX
    this._isSwiping = false
  },

  touchMove: function (e) {
    if (!this._touchItemId) return
    const deltaX = this._touchStartX - e.touches[0].clientX
    if (Math.abs(deltaX) < 8) return
    this._isSwiping = true

    const idx = this.data.list.findIndex(item => item._id === this._touchItemId)
    if (idx === -1) return

    const offset = Math.max(-160, Math.min(0, -deltaX))
    this.setData({
      ['list[' + idx + '].swipeX']: offset,
      ['list[' + idx + ']._touching']: true
    })
  },

  touchEnd: function (e) {
    if (!this._touchItemId) return
    const deltaX = this._touchStartX - e.changedTouches[0].clientX
    const idx = this.data.list.findIndex(item => item._id === this._touchItemId)
    if (idx !== -1) {
      if (this._isSwiping && deltaX > 60) {
        this.setData({
          ['list[' + idx + '].swipeX']: -160,
          ['list[' + idx + ']._touching']: false
        })
      } else {
        this.setData({
          ['list[' + idx + '].swipeX']: 0,
          ['list[' + idx + ']._touching']: false
        })
      }
    }
    this._touchItemId = null
    this._isSwiping = false
  },

  onScroll: function () {
    const list = this.data.list
    list.forEach((item, idx) => {
      if (item.swipeX && item.swipeX !== 0) {
        this.setData({ ['list[' + idx + '].swipeX']: 0 })
      }
    })
  },

  showAddForm: function () {
    this.setData({
      showForm: true,
      form: { categoryIndex: 0, amount: '', date: todayStr(), note: '' }
    })
  },

  hideAddForm: function () {
    this.setData({ showForm: false })
  },

  onCategoryChange: function (e) {
    this.setData({ 'form.categoryIndex': e.detail.value })
  },

  onFormInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },

  onFormDate: function (e) {
    this.setData({ 'form.date': e.detail.value })
  },

  saveExpense: function () {
    const form = this.data.form
    const category = this.data.categoryRange[form.categoryIndex]

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请填写有效金额', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    db.collection('expenses').add({
      data: {
        category: category,
        amount: amount,
        note: form.note.trim() || '',
        date: form.date,
        createTime: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '已保存' })
      wx.vibrateShort({ type: 'light' })
      this.setData({ showForm: false })
      this.loadAll()
    }).catch(err => {
      wx.hideLoading()
      console.error('保存失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  deleteRecord: function (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条支出记录？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          db.collection('expenses').doc(id).remove().then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已删除' })
            wx.vibrateShort({ type: 'light' })
            this.loadAll()
          }).catch(err => {
            wx.hideLoading()
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  noop: function () {}
})
