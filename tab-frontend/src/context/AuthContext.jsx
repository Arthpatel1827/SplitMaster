import { createContext, useContext, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = async (username, password) => {
    const { data } = await client.post('/auth/token/', { username, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    const me = await client.get('/auth/me/')
    setUser(me.data)
  }

  const register = async (username, password) => {
    await client.post('/auth/register/', { username, password })
    await login(username, password)
  }

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }

  const loadUser = async () => {
    if (!localStorage.getItem('access')) return
    try {
      const { data } = await client.get('/auth/me/')
      setUser(data)
    } catch {
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)