const express = require('express')
const jwt = require('jsonwebtoken')
const config = require('../config')
const sms = require('../utils/sms')
const auth = require('../middleware/auth')

const router = express.Router()

router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '请输入有效的手机号' })
    }

    const code = sms.generateCode(phone)
    await sms.sendSms(phone, code)

    res.json({ message: '验证码已发送' })
  } catch (err) {
    console.error('发送验证码失败', err)
    res.status(500).json({ error: '发送验证码失败' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      return res.status(400).json({ error: '请填写手机号和验证码' })
    }

    if (!sms.verifyCode(phone, code)) {
      return res.status(400).json({ error: '验证码错误或已过期' })
    }

    sms.clearCode(phone)

    const token = jwt.sign({ phone }, config.jwtSecret, { expiresIn: '7d' })
    res.json({ token, phone })
  } catch (err) {
    console.error('登录失败', err)
    res.status(500).json({ error: '登录失败' })
  }
})

router.get('/me', auth, (req, res) => {
  res.json({ phone: req.phone })
})

module.exports = router
