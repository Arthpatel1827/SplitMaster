import axios from 'axios'

const API_BASE = 'http://127.0.0.1:8000/api'

const client = axios.create({ baseURL: API_BASE })

client.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh })
          localStorage.setItem('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client