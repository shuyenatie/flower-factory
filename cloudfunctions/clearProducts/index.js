const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  var result = { products: 0, ordergroups: 0 }

  try {
    var pRes = await db.collection('products').get()
    var tasks = pRes.data.map(function (p) { return db.collection('products').doc(p._id).remove() })
    await Promise.all(tasks)
    result.products = pRes.data.length
  } catch (e) {}

  try {
    var gRes = await db.collection('ordergroups').get()
    var tasks2 = gRes.data.map(function (g) { return db.collection('ordergroups').doc(g._id).remove() })
    await Promise.all(tasks2)
    result.ordergroups = gRes.data.length
  } catch (e) {}

  return result
}
