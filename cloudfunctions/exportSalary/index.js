const cloud = require('wx-server-sdk')
const XLSX = require('xlsx')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { year, month, workers } = event

  const header = [['姓名', '手机号', '身份证号', '总件数', '工资总额（元）']]
  const rows = workers.map(w => [w.workerName, w.phone || '', w.idNumber || '', w.totalQuantity, w.totalAmount])
  const data = header.concat(rows)

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工资表')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return {
    base64: buffer.toString('base64'),
    fileName: year + '年' + month + '月工资表.xlsx'
  }
}
