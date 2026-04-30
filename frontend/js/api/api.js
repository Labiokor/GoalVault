const BASE_URL = '/api'

async function request(method, path, body = null) {
  const token = localStorage.getItem('gv_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  })

  const data = await res.json()

  // Auto logout on auth errors
  if (res.status === 401) {
    localStorage.removeItem('gv_token')
    localStorage.removeItem('gv_user')
    window.location.href = '/login.html'
    return
  }

  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  auth: {
    register: (body) => request('POST', '/auth/register', body),
    login:    (body) => request('POST', '/auth/login', body),
  },
  goals: {
    getAll:         (params = '') => request('GET', `/goals${params}`),
    create:         (body)        => request('POST', '/goals', body),
    update:         (id, body)    => request('PUT', `/goals/${id}`, body),
    updateProgress: (id, body)    => request('PATCH', `/goals/${id}/progress`, body),
    delete:         (id)          => request('DELETE', `/goals/${id}`),
  },
  tasks: {
    getAll:  (params = '') => request('GET', `/tasks${params}`),
    create:  (body)        => request('POST', '/tasks', body),
    update:  (id, body)    => request('PUT', `/tasks/${id}`, body),
    delete:  (id)          => request('DELETE', `/tasks/${id}`),
  },
  habits: {
    getAll:   (params = '') => request('GET', `/habits${params}`),
    create:   (body)        => request('POST', '/habits', body),
    update:   (id, body)    => request('PUT', `/habits/${id}`, body),
    complete: (id)          => request('PATCH', `/habits/${id}/complete`),
    delete:   (id)          => request('DELETE', `/habits/${id}`),
  },
  notes: {
    getAll:  (params = '') => request('GET', `/notes${params}`),
    create:  (body)        => request('POST', '/notes', body),
    update:  (id, body)    => request('PATCH', `/notes/${id}`, body),
    delete:  (id)          => request('DELETE', `/notes/${id}`),
  },
  finance: {
    getWallets:        ()            => request('GET', '/finance/wallets'),
    createWallet:      (body)        => request('POST', '/finance/wallets', body),
    updateWallet:      (id, body)    => request('PUT', `/finance/wallets/${id}`, body),
    deleteWallet:      (id)          => request('DELETE', `/finance/wallets/${id}`),
    getTransactions:   (params = '') => request('GET', `/finance/transactions${params}`),
    addTransaction:    (body)        => request('POST', '/finance/transactions', body),
    deleteTransaction: (id)          => request('DELETE', `/finance/transactions/${id}`),
    getSummary:        ()            => request('GET', '/finance/summary'),
    getBudgets:        ()            => request('GET', '/finance/budgets'),
    createBudget:      (body)        => request('POST', '/finance/budgets', body),
    updateBudget:      (id, body)    => request('PUT', `/finance/budgets/${id}`, body),
    deleteBudget:      (id)          => request('DELETE', `/finance/budgets/${id}`),
    checkPrompt:       (body)        => request('POST', '/finance/budgets/prompt', body),
  },
  reminders: {
    getAll:  (params = '') => request('GET', `/reminders${params}`),
    create:  (body)        => request('POST', '/reminders', body),
    update:  (id, body)    => request('PATCH', `/reminders/${id}`, body),
    delete:  (id)          => request('DELETE', `/reminders/${id}`),
  },
  notifications: {
    getAll:      ()   => request('GET', '/notification'),
    getUnread:   ()   => request('GET', '/notification/unread'),
    markRead:    (id) => request('PATCH', `/notification/${id}/read`),
    markAllRead: ()   => request('PATCH', '/notification/read-all'),
    delete:      (id) => request('DELETE', `/notification/${id}`),
    deleteAll:   ()   => request('DELETE', '/notification'),
  }
}