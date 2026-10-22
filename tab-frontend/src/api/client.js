import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'

const client = axios.create({ baseURL: API_BASE, timeout: 30000 })

client.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

let refreshing = null

function clearSession() {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.includes('/auth/token')
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          // share one refresh request between concurrent 401s (refresh tokens rotate)
          refreshing = refreshing || axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
          const { data } = await refreshing
          localStorage.setItem('access', data.access)
          if (data.refresh) localStorage.setItem('refresh', data.refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch {
          clearSession()
        } finally {
          refreshing = null
        }
      } else {
        clearSession()
      }
    }
    return Promise.reject(error)
  }
)

export default client
