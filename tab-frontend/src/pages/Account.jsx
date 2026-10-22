import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Trash2 } from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmProvider'
import { getErrorMessage } from '../utils/errors'
import BottomNav from '../components/BottomNav'

const inputCls = 'w-full h-[54px] px-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors'
const labelCls = 'text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-2'

export default function Account() {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const [deletePw, setDeletePw] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setSavingProfile(true)
    try {
      const { data } = await client.patch('/auth/me/', { username, email })
      setUser(data)
      toast.success('Profile updated')
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Could not update your profile.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    setSavingPw(true)
    try {
      await client.post('/auth/change-password/', { current_password: currentPw, new_password: newPw })
      setCurrentPw('')
      setNewPw('')
      toast.success('Password changed')
    } catch (err) {
      setPwError(getErrorMessage(err, 'Could not change your password.'))
    } finally {
      setSavingPw(false)
    }
  }

  const deleteAccount = async (e) => {
    e.preventDefault()
    setDeleteError('')
    const ok = await confirm({
      title: 'Delete your account?',
      message: "You'll be removed from all your groups and won't be able to log in again. Expenses you paid stay in the group history, under a deleted-user name.",
      confirmLabel: 'Delete account',
      danger: true,
    })
    if (!ok) return
    try {
      await client.post('/auth/delete-account/', { password: deletePw })
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      setUser(null)
      navigate('/login')
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Could not delete your account.'))
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-6 pb-28 animate-[fadeIn_0.25s_ease-out]">
      <Link to="/groups" className="text-muted text-sm hover:text-ink transition-colors">&larr; Your groups</Link>
      <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-6">Account</h1>

      <form onSubmit={saveProfile} className="space-y-3 mb-8">
        <div className={labelCls}>Profile</div>
        <input className={inputCls} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          type="email" className={inputCls} placeholder="Email (used for password reset)"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        {profileError && <p className="text-rust text-sm">{profileError}</p>}
        <button disabled={savingProfile} className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl disabled:opacity-60">
          {savingProfile ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-3 mb-8">
        <div className={labelCls}>Change password</div>
        <input
          type="password" autoComplete="current-password" className={inputCls} placeholder="Current password"
          value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
        />
        <input
          type="password" autoComplete="new-password" className={inputCls} placeholder="New password"
          value={newPw} onChange={(e) => setNewPw(e.target.value)}
        />
        {pwError && <p className="text-rust text-sm">{pwError}</p>}
        <button disabled={savingPw || !currentPw || !newPw} className="w-full border-[1.5px] border-ink font-bold h-[54px] rounded-2xl disabled:opacity-50">
          {savingPw ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <button
        onClick={logout}
        className="w-full border border-[#cfcab9] bg-white font-bold h-[54px] rounded-2xl mb-8 flex items-center justify-center gap-2"
      >
        <LogOut size={16} /> Log out
      </button>

      <form onSubmit={deleteAccount} className="space-y-3">
        <div className={labelCls}>Danger zone</div>
        <input
          type="password" autoComplete="current-password" className={inputCls}
          placeholder="Enter your password to delete your account"
          value={deletePw} onChange={(e) => setDeletePw(e.target.value)}
        />
        {deleteError && <p className="text-rust text-sm">{deleteError}</p>}
        <button
          disabled={!deletePw}
          className="w-full bg-rustbg text-rust font-bold h-[54px] rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trash2 size={16} /> Delete my account
        </button>
      </form>
      <BottomNav />
    </div>
  )
}
