const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.post('/', async (req, res) => {
  try {
    const { workerId, productId, workerName, productName, quantity, price, date } = req.body
    if (!workerId || !productId || !quantity || !date) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    const id = await cloudbase.add('records', {
      workerId,
      productId,
      workerName: workerName || '',
      productName: productName || '',
      quantity: parseInt(quantity),
      price: parseFloat(price) || 0,
      date,
      createTime: new Date().toISOString()
    })
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', async (req, res) => {
  try {
    const { date, month } = req.query
    let condition = ''

    if (date) {
      condition = `{date:"${date}"}`
    } else if (month) {
      const [y, m] = month.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      condition = `{date:_.gte("${month}-01").and(_.lte("${month}-${lastDay}"))}`
    }

    const list = await cloudbase.find('records', condition, 'createTime desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.remove('records', req.params.id)
    res.json({ message: '已删除' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
