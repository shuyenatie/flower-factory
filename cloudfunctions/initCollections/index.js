const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const collections = ['clients', 'orders', 'order_records']
  const results = []
  for (const name of collections) {
    try {
      await db.createCollection(name)
      results.push({ name, created: true })
    } catch (e) {
      results.push({ name, created: false, err: e.message })
    }
  }
  return results
}
