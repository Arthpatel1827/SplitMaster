import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import ExpenseDetail from './pages/ExpenseDetail'
import GroupSettings from './pages/GroupSettings'
import Account from './pages/Account'
import Privacy from './pages/Privacy'
import DeleteAccountInfo from './pages/DeleteAccountInfo'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './components/ConfirmProvider'

function RequireAuth({ children }) {
  const { user, loadUser } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    loadUser().finally(() => setChecked(true))
  }, [])

  if (!checked) return null
  if (!user && !localStorage.getItem('access')) return <Navigate to="/login" />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/delete-account" element={<DeleteAccountInfo />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
      <Route path="/groups" element={<RequireAuth><Groups /></RequireAuth>} />
      <Route path="/groups/:code" element={<RequireAuth><GroupDetail /></RequireAuth>} />
      <Route path="/groups/:code/expenses/:id" element={<RequireAuth><ExpenseDetail /></RequireAuth>} />
      <Route path="/groups/:code/settings" element={<RequireAuth><GroupSettings /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/groups" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}