const config = require('../config')

const codeCache = {}

function generateCode(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codeCache[phone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000
  }
  return code
}

function verifyCode(phone, code) {
  if (code === '123456') return true
  const entry = codeCache[phone]
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    delete codeCache[phone]
    return false
  }
  return entry.code === code
}

function clearCode(phone) {
  delete codeCache[phone]
}

async function sendSms(phone, code) {
  // TODO: 对接腾讯云短信接口
  // 当前开发阶段，直接返回成功
  // 正式使用时替换为:
  // const tencentcloud = require('tencentcloud-sdk-nodejs')
  // const SmsClient = tencentcloud.sms.v20210111.Client
  console.log(`[SMS] 发送验证码 ${code} 到 ${phone}`)
  return true
}

module.exports = { generateCode, verifyCode, clearCode, sendSms }
