const TOKEN_KEY = 'flower_token'
const PHONE_KEY = 'flower_phone'

let baseUrl = 'http://localhost:3000'

export function setBaseUrl(url) {
  baseUrl = url
}

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function getPhone() {
  return uni.getStorageSync(PHONE_KEY) || ''
}

export function setPhone(phone) {
  uni.setStorageSync(PHONE_KEY, phone)
}

export function logout() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(PHONE_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

async function request(method, path, data) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token

  return new Promise((resolve, reject) => {
    uni.request({
      url: baseUrl + path,
      method,
      header: headers,
      data,
      success: (res) => {
        if (res.statusCode === 401) {
          logout()
          uni.reLaunch({ url: '/pages/login/login' })
          reject(new Error('未登录'))
          return
        }
        resolve(res.data)
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export const api = {
  // 登录
  sendCode: (phone) => request('POST', '/api/auth/send-code', { phone }),
  login: (phone, code) => request('POST', '/api/auth/login', { phone, code }),

  // 工人
  getWorkers: () => request('GET', '/api/workers'),
  addWorker: (data) => request('POST', '/api/workers', data),
  updateWorker: (id, data) => request('PUT', `/api/workers/${id}`, data),
  deleteWorker: (id) => request('DELETE', `/api/workers/${id}`),

  // 花型
  getProducts: () => request('GET', '/api/products'),
  addProduct: (data) => request('POST', '/api/products', data),
  updateProduct: (id, data) => request('PUT', `/api/products/${id}`, data),
  deleteProduct: (id) => request('DELETE', `/api/products/${id}`),

  // 计件记录
  addRecord: (data) => request('POST', '/api/records', data),
  getRecordsByDate: (date) => request('GET', `/api/records?date=${date}`),
  getRecordsByMonth: (month) => request('GET', `/api/records?month=${month}`),
  deleteRecord: (id) => request('DELETE', `/api/records/${id}`),

  // 收入
  getIncomes: (month) => request('GET', `/api/incomes?month=${month}`),
  addIncome: (data) => request('POST', '/api/incomes', data),
  deleteIncome: (id) => request('DELETE', `/api/incomes/${id}`),

  // 支出
  getExpenses: (month) => request('GET', `/api/expenses?month=${month}`),
  addExpense: (data) => request('POST', '/api/expenses', data),
  deleteExpense: (id) => request('DELETE', `/api/expenses/${id}`),

  // 客户
  getClients: () => request('GET', '/api/clients'),
  addClient: (data) => request('POST', '/api/clients', data),
  updateClient: (id, data) => request('PUT', `/api/clients/${id}`, data),
  deleteClient: (id) => request('DELETE', `/api/clients/${id}`),

  // 加工单
  getOrders: (status) => request('GET', `/api/orders?status=${status}`),
  addOrder: (data) => request('POST', '/api/orders', data),
  completeOrder: (id, data) => request('PUT', `/api/orders/${id}/complete`, data),
  deleteOrder: (id) => request('DELETE', `/api/orders/${id}`),
  linkRecord: (orderId, recordId) => request('POST', `/api/orders/${orderId}/records`, { recordId }),

  // 工资
  getSalary: (month) => request('GET', `/api/salary?month=${month}`),

  // 导出
  exportSalary: (month) => `${baseUrl}/api/export/salary?month=${month}&token=${getToken()}`,
  exportRecords: (month) => `${baseUrl}/api/export/records?month=${month}&token=${getToken()}`
}
