const express = require('express')
const XLSX = require('xlsx')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/salary', async (req, res) => {
  try {
    const { month } = req.query
    if (!month) return res.status(400).json({ error: '请指定月份' })

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

    const workers = await cloudbase.find('workers')
    const nameMap = {}
    workers.forEach(w => { nameMap[w.name] = w })

    const rows = Object.values(workerMap).map(w => {
      const info = nameMap[w.workerName] || {}
      return {
        '姓名': w.workerName,
        '手机号': info.phone || '',
        '身份证号': info.idNumber || '',
        '总件数': w.totalQuantity,
        '工资总额': parseFloat(w.totalAmount.toFixed(2))
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工资汇总')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const fileName = `${month}工资表.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/records', async (req, res) => {
  try {
    const { month } = req.query
    if (!month) return res.status(400).json({ error: '请指定月份' })

    const [y, m] = month.split('-')
    const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
    const condition = `{date:_.gte("${month}-01").and(_.lte("${month}-${lastDay}"))}`

    const records = await cloudbase.find('records', condition, 'date asc')

    const rows = records.map(r => ({
      '日期': r.date,
      '工人': r.workerName,
      '花型': r.productName,
      '数量': r.quantity,
      '单价': r.price,
      '金额': parseFloat((r.quantity * r.price).toFixed(1))
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '计件明细')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const fileName = `${month}计件明细.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
