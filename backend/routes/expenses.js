const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const { month } = req.query
    let condition = ''
    if (month) {
      const [y, m] = month.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      condition = `{date:_.gte("${month}-01").and(_.lte("${month}-${lastDay}"))}`
    }
    const list = await cloudbase.find('expenses', condition, 'date desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { category, amount, date, note } = req.body
    if (!category || !amount || !date) {
      return res.status(400).json({ error: '缺少必填字段' })
    }
    const id = await cloudbase.add('expenses', {
      category,
      amount: parseFloat(amount),
      date,
      note: note || '',
      createTime: new Date().toISOString()
    })
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.remove('expenses', req.params.id)
    res.json({ message: '已删除' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
