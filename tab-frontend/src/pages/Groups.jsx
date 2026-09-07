import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const { user, logout } = useAuth()

  const loadGroups = async () => {
    const { data } = await client.get('/groups/')
    setGroups(data)
  }

  useEffect(() => { loadGroups() }, [])

  const createGroup = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await client.post('/groups/', { name })
      setName('')
      loadGroups()
    } catch {
      setError('Enter a group name.')
    }
  }

  const joinGroup = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await client.post('/groups/join/', { code })
      setCode('')
      loadGroups()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not join that group.')
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs tracking-widest text-muted uppercase font-semibold">Hey {user?.username}</div>
          <h1 className="text-2xl font-bold mt-0.5">Your groups</h1>
        </div>
        <button onClick={logout} className="text-sm text-muted underline">Log out</button>
      </div>

      {error && <p className="text-rust text-sm mb-3">{error}</p>}

      {groups.length === 0 && (
        <div className="border border-dashed border-line rounded-2xl px-6 py-10 text-center text-muted text-sm mb-6">
          No groups yet. Create one or join one with a code.
        </div>
      )}

      <div className="space-y-3 mb-6">
        {groups.map((g) => (
          <Link
            key={g.id}
            to={`/groups/${g.code}`}
            className="flex items-center justify-between bg-white border border-line rounded-2xl px-4 py-4"
          >
            <div>
              <div className="font-semibold">{g.name}</div>
              <div className="text-xs text-muted font-mono mt-0.5">{g.code}</div>
            </div>
            <span className="text-muted">&rarr;</span>
          </Link>
        ))}
      </div>

      <form onSubmit={createGroup} className="mb-4 space-y-2">
        <input
          className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
          placeholder="New group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="w-full bg-ink text-paper font-semibold py-3 rounded-xl" type="submit">
          Create
        </button>
      </form>

      <form onSubmit={joinGroup} className="space-y-2">
        <input
          className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
          placeholder="Group code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button className="w-full border border-ink text-ink font-semibold py-3 rounded-xl" type="submit">
          Join
        </button>
      </form>
    </div>
  )
}