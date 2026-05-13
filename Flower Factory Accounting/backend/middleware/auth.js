const jwt = require('jsonwebtoken')
const config = require('../config')

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    req.phone = decoded.phone
    next()
  } catch (err) {
    return res.status(401).json({ error: '认证令牌无效或已过期' })
  }
}
