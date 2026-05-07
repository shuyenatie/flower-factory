const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const list = await cloudbase.find('workers', '{active:true}', 'createTime desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, idCard } = req.body
    if (!name) return res.status(400).json({ error: '请输入姓名' })
    const id = await cloudbase.add('workers', {
      name,
      phone: req.body.phone || '',
      idNumber: idCard || '',
      active: true,
      createTime: new Date().toISOString()
    })
    res.json({ id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const data = {}
    if (req.body.name !== undefined) data.name = req.body.name
    if (req.body.phone !== undefined) data.phone = req.body.phone
    if (req.body.idCard !== undefined) data.idNumber = req.body.idCard
    await cloudbase.update('workers', req.params.id, data)
    res.json({ message: '已更新' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.update('workers', req.params.id, { active: false })
    res.json({ message: '已标记离职' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
