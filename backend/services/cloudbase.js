const fetch = require('node-fetch')
const config = require('../config')

let cachedToken = null
let tokenExpiresAt = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  if (!config.wxAppid || !config.wxSecret) {
    throw new Error('请在 .env 中配置 WX_APPID 和 WX_SECRET')
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wxAppid}&secret=${config.wxSecret}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg}`)
  }

  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

async function request(endpoint, query) {
  const token = await getAccessToken()
  const url = `https://api.weixin.qq.com/tcb/${endpoint}?access_token=${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: config.cloudEnv, query })
  })
  const data = await res.json()

  if (data.errcode) {
    throw new Error(`云开发请求失败 [${endpoint}]: ${data.errmsg}`)
  }

  return data
}

async function find(collection, condition = '', orderBy = '', limit = 100) {
  let query = `db.collection("${collection}")`
  if (condition) query += `.where(${condition})`
  if (orderBy) query += `.orderBy(${orderBy})`
  query += `.limit(${limit}).get()`

  const result = await request('databasequery', query)
  return JSON.parse(result.data)
}

async function findOne(collection, condition) {
  const list = await find(collection, condition, '', 1)
  return list.length > 0 ? list[0] : null
}

async function add(collection, data) {
  const query = `db.collection("${collection}").add({data:${JSON.stringify(data)}})`
  const result = await request('databaserecordadd', query)
  return result.id_list[0]
}

async function update(collection, id, data) {
  const query = `db.collection("${collection}").doc("${id}").update({data:${JSON.stringify(data)}})`
  await request('databaseupdate', query)
}

async function remove(collection, id) {
  const query = `db.collection("${collection}").doc("${id}").remove()`
  await request('databaserecorddelete', query)
}

async function whereRemove(collection, condition) {
  const query = `db.collection("${collection}").where(${condition}).remove()`
  await request('databaserecorddelete', query)
}

async function count(collection, condition = '') {
  let query = `db.collection("${collection}")`
  if (condition) query += `.where(${condition})`
  query += `.count()`

  const result = await request('databasequery', query)
  const parsed = JSON.parse(result.data)
  return parsed[0] ? parsed[0].total : 0
}

module.exports = {
  getAccessToken,
  find,
  findOne,
  add,
  update,
  remove,
  whereRemove,
  count
}
