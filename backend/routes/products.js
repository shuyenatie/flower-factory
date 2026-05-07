const express = require('express')
const auth = require('../middleware/auth')
const cloudbase = require('../services/cloudbase')

const router = express.Router()

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const list = await cloudbase.find('products', '{active:true}', 'createTime desc')
    res.json({ data: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, price, modelNo, defaultHandsPerPiece, orderNos, supplyPrice } = req.body
    if (!name) return res.status(400).json({ error: '请输入花型名称' })
    const id = await cloudbase.add('products', {
      name,
      price: parseFloat(price) || 0,
      modelNo: modelNo || '',
      defaultHandsPerPiece: parseInt(defaultHandsPerPiece) || 0,
      orderNos: orderNos || [],
      supplyPrice: parseFloat(supplyPrice) || 0,
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
    if (req.body.price !== undefined) data.price = parseFloat(req.body.price)
    if (req.body.modelNo !== undefined) data.modelNo = req.body.modelNo
    if (req.body.defaultHandsPerPiece !== undefined) data.defaultHandsPerPiece = parseInt(req.body.defaultHandsPerPiece)
    if (req.body.orderNos !== undefined) data.orderNos = req.body.orderNos
    if (req.body.supplyPrice !== undefined) data.supplyPrice = parseFloat(req.body.supplyPrice)
    await cloudbase.update('products', req.params.id, data)
    res.json({ message: '已更新' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await cloudbase.update('products', req.params.id, { active: false })
    res.json({ message: '已下架' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
