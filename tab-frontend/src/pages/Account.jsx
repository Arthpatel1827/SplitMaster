import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Trash2, User, Lock } from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmProvider'
import { getErrorMessage } from '../utils/errors'
import BottomNav from '../components/BottomNav'

const inputCls = 'w-full h-[54px] px-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors'
const card = 'bg-white border border-[#e6e2d6] rounded-[24px] p-4 space-y-3'

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
    <div className="max-w-md mx-auto px-5 pt-7 pb-28 animate-[fadeIn_0.25s_ease-out]">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-tealbg text-teal flex items-center justify-center text-3xl font-extrabold">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mt-3">{user?.username}</h1>
        <div className="text-sm text-muted">{user?.email || 'No email added'}</div>
      </div>

      <form onSubmit={saveProfile} className={`${card} mb-4`}>
        <div className="flex items-center gap-2 font-extrabold"><User size={18} /> Profile</div>
        <input aria-label="Username" className={inputCls} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          aria-label="Email" type="email" className={inputCls} placeholder="Email (used for password reset)"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        {profileError && <p className="text-rust text-sm">{profileError}</p>}
        <button disabled={savingProfile} className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl disabled:opacity-60">
          {savingProfile ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <form onSubmit={changePassword} className={`${card} mb-4`}>
        <div className="flex items-center gap-2 font-extrabold"><Lock size={18} /> Change password</div>
        <input
          aria-label="Current password" type="password" autoComplete="current-password" className={inputCls} placeholder="Current password"
          value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
        />
        <input
          aria-label="New password" type="password" autoComplete="new-password" className={inputCls} placeholder="New password"
          value={newPw} onChange={(e) => setNewPw(e.target.value)}
        />
        {pwError && <p className="text-rust text-sm">{pwError}</p>}
        <button disabled={savingPw || !currentPw || !newPw} className="w-full border-[1.5px] border-ink font-bold h-[54px] rounded-2xl disabled:opacity-40">
          {savingPw ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <button
        onClick={logout}
        className="w-full border border-[#cfcab9] bg-white font-bold h-[54px] rounded-2xl mb-6 flex items-center justify-center gap-2"
      >
        <LogOut size={17} /> Log out
      </button>

      <form onSubmit={deleteAccount} className="bg-rustbg rounded-[24px] p-4 space-y-3">
        <div className="flex items-center gap-2 font-extrabold text-rust"><Trash2 size={18} /> Delete account</div>
        <p className="text-sm text-rust/90">This removes you from all groups. You must be settled up first.</p>
        <input
          aria-label="Password to confirm" type="password" autoComplete="current-password" className={inputCls}
          placeholder="Enter your password"
          value={deletePw} onChange={(e) => setDeletePw(e.target.value)}
        />
        {deleteError && <p className="text-rust text-sm">{deleteError}</p>}
        <button disabled={!deletePw} className="w-full bg-rust text-white font-bold h-[54px] rounded-2xl disabled:opacity-40">
          Delete my account
        </button>
      </form>
      <p className="text-center text-xs text-muted mt-6">
        <Link to="/privacy" className="underline">Privacy Policy</Link>
      </p>
      <BottomNav />
    </div>
  )
}
