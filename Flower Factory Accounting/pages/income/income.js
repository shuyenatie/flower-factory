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
    editingId: '',
    form: { clientName: '', amount: '', date: todayStr(), note: '' },
    currentMonth: monthStr(todayStr()),
    loading: true,
    defaultClientName: ''
  },

  onLoad: function () {
    this.loadAll()
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    var self = this
    self.setData({ loading: true })

    db.collection('clients').where({ active: true }).limit(100).get().then(function (res) {
      var name = ''
      if (res.data.length > 0) {
        name = res.data[0].name
      }
      self.setData({ defaultClientName: name })
    }).catch(function () {})

    db.collection('incomes').orderBy('date', 'desc').orderBy('createTime', 'desc').limit(100).get().then(function (res) {
      var raw = res.data
      var list = raw.map(function (r) {
        return {
          _id: r._id,
          clientName: r.clientName || '',
          amount: r.amount || 0,
          amountText: (r.amount || 0).toFixed(2),
          note: r.note || '',
          date: r.date || '',
          orderNo: r.orderNo || ''
        }
      })
      self.setData({
        list: list,
        loading: false
      })
      self.calcMonthTotal()
    }).catch(function (err) {
      console.error('加载收入记录失败', err)
      self.setData({ loading: false })
      if (err.errCode === -502005) {
        wx.showToast({ title: '数据库集合 "incomes" 不存在', icon: 'none', duration: 3000 })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  calcMonthTotal: function () {
    var cm = this.data.currentMonth
    var total = 0
    this.data.list.forEach(function (item) {
      if (item.date && item.date.slice(0, 7) === cm) {
        total += item.amount
      }
    })
    this.setData({ monthTotal: total.toFixed(2) })
  },

  showAddForm: function () {
    this.setData({
      showForm: true,
      editingId: '',
      form: {
        clientName: this.data.defaultClientName,
        amount: '',
        date: todayStr(),
        note: '',
        orderNo: ''
      }
    })
  },

  showEditForm: function (e) {
    var item = e.currentTarget.dataset.item
    this.setData({
      showForm: true,
      editingId: item._id,
      form: {
        clientName: this.data.defaultClientName || item.clientName,
        amount: String(item.amount),
        date: item.date,
        note: item.note || '',
        orderNo: item.orderNo || ''
      }
    })
  },

  hideAddForm: function () {
    this.setData({ showForm: false })
  },

  onFormInput: function (e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    this.setData({ ['form.' + field]: value })
  },

  onFormDate: function (e) {
    this.setData({ 'form.date': e.detail.value })
  },

  saveIncome: function () {
    var form = this.data.form
    var amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请填写有效金额', icon: 'none' })
      return
    }

    var data = {
      clientName: form.clientName.trim(),
      amount: amount,
      note: form.note.trim() || '',
      date: form.date,
      orderNo: form.orderNo || ''
    }

    wx.showLoading({ title: '保存中...' })

    if (this.data.editingId) {
      db.collection('incomes').doc(this.data.editingId).update({ data: data }).then(function () {
        wx.hideLoading()
        wx.showToast({ title: '已更新' })
        wx.vibrateShort({ type: 'light' })
        this.setData({ showForm: false })
        this.loadAll()
      }.bind(this)).catch(function (err) {
        wx.hideLoading()
        console.error('更新失败', err)
        wx.showToast({ title: '更新失败', icon: 'none' })
      })
    } else {
      data.createTime = db.serverDate()
      db.collection('incomes').add({ data: data }).then(function () {
        wx.hideLoading()
        wx.showToast({ title: '已保存' })
        wx.vibrateShort({ type: 'light' })
        this.setData({ showForm: false })
        this.loadAll()
      }.bind(this)).catch(function (err) {
        wx.hideLoading()
        console.error('保存失败', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
    }
  },

  deleteRecord: function (e) {
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条收入记录？',
      success: function (res) {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        db.collection('incomes').doc(id).remove().then(function () {
          wx.hideLoading()
          wx.showToast({ title: '已删除' })
          wx.vibrateShort({ type: 'light' })
          this.loadAll()
        }.bind(this)).catch(function (err) {
          wx.hideLoading()
          console.error('删除失败', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        })
      }.bind(this)
    })
  },

  noop: function () {}
})
