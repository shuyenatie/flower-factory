const express = require('express')
const cors = require('cors')
require('dotenv').config()

const cloudbase = require('./services/cloudbase')
const config = require('./config')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/hello', async (req, res) => {
  try {
    let dbStatus = '未配置'
    if (config.wxAppid && config.wxSecret) {
      const count = await cloudbase.count('workers')
      dbStatus = `云开发已连接，workers 集合共 ${count} 条数据`
    }
    res.json({
      message: '手工花厂计件管理系统 API v1.0.0',
      status: 'ok',
      database: dbStatus
    })
  } catch (err) {
    res.json({
      message: '手工花厂计件管理系统 API v1.0.0',
      status: 'ok',
      database: `连接失败: ${err.message}`
    })
  }
})

app.use('/api/auth', require('./routes/auth'))
app.use('/api/workers', require('./routes/workers'))
app.use('/api/products', require('./routes/products'))
app.use('/api/records', require('./routes/records'))
app.use('/api/incomes', require('./routes/incomes'))
app.use('/api/expenses', require('./routes/expenses'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/orders', require('./routes/orders'))
app.use('/api/salary', require('./routes/salary'))
app.use('/api/export', require('./routes/export'))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
