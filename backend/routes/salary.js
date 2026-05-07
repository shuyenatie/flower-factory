const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const { month } = req.query
    if (!month) return res.status(400).json({ error: '请指定月份参数 month=YYYY-MM' })

    const [y, m] = month.split('-')
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
    const condition = `{date:_.gte("${month}-01").and(_.lte("${month}-${lastDay}"))}`

    const records = await cloudbase.find('records', condition, 'date asc')
    const workerMap = {}

    records.forEach(r => {
      const wid = r.workerId
      if (!workerMap[wid]) {
        workerMap[wid] = { workerId: wid, workerName: r.workerName, totalQuantity: 0, totalAmount: 0 }
      }
      workerMap[wid].totalQuantity += r.quantity
      workerMap[wid].totalAmount += r.quantity * r.price
    })

    const result = Object.values(workerMap).sort((a, b) => b.totalAmount - a.totalAmount)
    res.json({ data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
