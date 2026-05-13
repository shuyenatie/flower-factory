const TOKEN_KEY = 'flower_token'
const PHONE_KEY = 'flower_phone'

let baseUrl = 'https://flower-factory.onrender.com'

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

function normalizeError(res) {
  if (res && typeof res === 'object') {
    return res.error || res.message || '请求失败'
  }
  return '请求失败'
}

async function request(method, path, data) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

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
          reject(new Error('未登录或登录已失效'))
          return
        }

        if (res.statusCode >= 400) {
          reject(new Error(normalizeError(res.data)))
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
  sendCode: (phone) => request('POST', '/api/auth/send-code', { phone }),
  login: (phone, code) => request('POST', '/api/auth/login', { phone, code }),

  getWorkers: () => request('GET', '/api/workers'),
  addWorker: (data) => request('POST', '/api/workers', data),
  updateWorker: (id, data) => request('PUT', `/api/workers/${id}`, data),
  deleteWorker: (id) => request('DELETE', `/api/workers/${id}`),

  getProducts: () => request('GET', '/api/products'),
  addProduct: (data) => request('POST', '/api/products', data),
  updateProduct: (id, data) => request('PUT', `/api/products/${id}`, data),
  deleteProduct: (id) => request('DELETE', `/api/products/${id}`),

  addRecord: (data) => request('POST', '/api/records', data),
  getRecordsByDate: (date) => request('GET', `/api/records?date=${date}`),
  getRecordsByMonth: (month) => request('GET', `/api/records?month=${month}`),
  deleteRecord: (id) => request('DELETE', `/api/records/${id}`),

  getIncomes: (month) => request('GET', `/api/incomes?month=${month}`),
  addIncome: (data) => request('POST', '/api/incomes', data),
  deleteIncome: (id) => request('DELETE', `/api/incomes/${id}`),

  getExpenses: (month) => request('GET', `/api/expenses?month=${month}`),
  addExpense: (data) => request('POST', '/api/expenses', data),
  deleteExpense: (id) => request('DELETE', `/api/expenses/${id}`),

  getClients: () => request('GET', '/api/clients'),
  addClient: (data) => request('POST', '/api/clients', data),
  updateClient: (id, data) => request('PUT', `/api/clients/${id}`, data),
  deleteClient: (id) => request('DELETE', `/api/clients/${id}`),

  getOrders: (status) => request('GET', `/api/orders?status=${status}`),
  addOrder: (data) => request('POST', '/api/orders', data),
  completeOrder: (id, data) => request('PUT', `/api/orders/${id}/complete`, data),
  deleteOrder: (id) => request('DELETE', `/api/orders/${id}`),
  linkRecord: (orderId, recordId) => request('POST', `/api/orders/${orderId}/records`, { recordId }),

  getSalary: (month) => request('GET', `/api/salary?month=${month}`),

  exportSalary: (month) => `${baseUrl}/api/export/salary?month=${month}&token=${getToken()}`,
  exportRecords: (month) => `${baseUrl}/api/export/records?month=${month}&token=${getToken()}`
}
