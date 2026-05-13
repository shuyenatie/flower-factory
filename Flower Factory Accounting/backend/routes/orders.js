const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    let condition = ''
    if (status === 'pending') {
      condition = '{status:"pending"}'
    } else if (status === 'completed') {
      condition = '{status:"completed"}'
    }
    const list = await cloudbase.find('orders', condition, 'createTime desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { clientId, clientName, orderDate, returnDate, productList, processingFee, note } = req.body
    if (!clientId || !clientName || !orderDate) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    const id = await cloudbase.add('orders', {
      clientId,
      clientName,
      orderDate,
      returnDate: returnDate || '',
      actualReturnDate: '',
      productList: productList || [],
      processingFee: parseFloat(processingFee) || 0,
      status: 'pending',
      note: note || '',
      createTime: new Date().toISOString()
    })
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/complete', async (req, res) => {
  try {
    const { actualReturnDate, processingFee } = req.body
    if (!actualReturnDate) return res.status(400).json({ error: '请选择实际送回日期' })

    await cloudbase.update('orders', req.params.id, {
      status: 'completed',
      actualReturnDate,
      processingFee: parseFloat(processingFee) || 0
    })

    const order = await cloudbase.findOne('orders', `{_id:"${req.params.id}"}`)
    if (order) {
      await cloudbase.add('incomes', {
        clientName: order.clientName,
        amount: parseFloat(processingFee) || 0,
        date: actualReturnDate,
        orderNo: order.orderNo || '',
        note: order.orderNo ? '加工单 ' + order.orderNo : '加工单完工',
        createTime: new Date().toISOString()
      })
    }

    res.json({ message: '已标记完成，收入已记录' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.remove('orders', req.params.id)
    await cloudbase.whereRemove('order_records', `{orderId:"${req.params.id}"}`)
    res.json({ message: '已删除' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/records', async (req, res) => {
  try {
    const { recordId } = req.body
    if (!recordId) return res.status(400).json({ error: '缺少 recordId' })
    const id = await cloudbase.add('order_records', {
      orderId: req.params.id,
      recordId,
      createTime: new Date().toISOString()
    })
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
