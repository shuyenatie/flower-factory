const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const list = await cloudbase.find('clients', '{active:true}', 'createTime desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, phone, address, note } = req.body
    if (!name) return res.status(400).json({ error: '请输入客户名称' })
    const id = await cloudbase.add('clients', {
      name,
      phone: phone || '',
      address: address || '',
      note: note || '',
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
    if (req.body.address !== undefined) data.address = req.body.address
    if (req.body.note !== undefined) data.note = req.body.note
    await cloudbase.update('clients', req.params.id, data)
    res.json({ message: '已更新' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.update('clients', req.params.id, { active: false })
    res.json({ message: '已标记停止合作' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
