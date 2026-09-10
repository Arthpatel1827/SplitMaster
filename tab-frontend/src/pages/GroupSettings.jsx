import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'

export default function GroupSettings() {
    const { code } = useParams()
    const navigate = useNavigate()
    const [settings, setSettings] = useState(null)
    const [name, setName] = useState('')
    const [error, setError] = useState('')

    const load = async () => {
        const { data } = await client.get(`/groups/${code}/settings/`)
        setSettings(data)
        setName(data.name)
    }

    useEffect(() => { load() }, [code])

    const saveName = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const { data } = await client.patch(`/groups/${code}/settings/`, { name })
            setSettings(data)
        } catch {
            setError('Enter a valid group name.')
        }
    }

    const toggleSimplify = async () => {
        const { data } = await client.patch(`/groups/${code}/settings/`, {
            simplify_debts: !settings.simplify_debts,
        })
        setSettings(data)
    }

    const leaveGroup = async () => {
        if (!confirm("Leave this group? You can only leave once you're fully settled up.")) return
        try {
            await client.post(`/groups/${code}/leave/`)
            navigate('/groups')
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not leave the group.')
        }
    }

    const deleteGroup = async () => {
        if (!confirm('Delete this group permanently? This removes all expenses and activity. This cannot be undone.')) return
        try {
            await client.delete(`/groups/${code}/delete/`)
            navigate('/groups')
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not delete the group.')
        }
    }

    if (!settings) return <div className="max-w-md mx-auto px-5 py-6">Loading...</div>

    return (
        <div className="max-w-md mx-auto px-5 py-6">
            <Link to={`/groups/${code}`} className="text-muted text-sm">&larr; {settings.name}</Link>
            <h1 className="text-2xl font-bold mt-2 mb-6">Group settings</h1>

            {error && <p className="text-rust text-sm mb-4">{error}</p>}

            <form onSubmit={saveName} className="mb-6">
                <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Group name</div>
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-4 py-3 rounded-xl border border-line bg-white outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button type="submit" className="bg-ink text-paper font-semibold px-5 rounded-xl">Save</button>
                </div>
            </form>

            <div className="bg-white border border-line rounded-2xl p-4 flex items-center justify-between mb-6">
                <div className="pr-4">
                    <div className="font-semibold">Simplify settle-up</div>
                    <p className="text-sm text-muted mt-1">
                        When on, Tab suggests the fewest payments to settle everyone up. When off, you'll see exact pairwise amounts.
                    </p>
                </div>
                <button
                    onClick={toggleSimplify}
                    className={`w-12 h-7 rounded-full flex-shrink-0 relative transition-colors ${settings.simplify_debts ? 'bg-teal' : 'bg-line'
                        }`}
                >
                    <span
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.simplify_debts ? 'left-6' : 'left-1'
                            }`}
                    />
                </button>
            </div>

            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Danger zone</div>
            <button
                onClick={leaveGroup}
                className="w-full text-rust font-semibold py-3 rounded-xl border border-line mb-3"
            >
                Leave group
            </button>
            {settings.is_creator && (
                <button
                    onClick={deleteGroup}
                    className="w-full bg-rustbg text-rust font-semibold py-3 rounded-xl"
                >
                    Delete group
                </button>
            )}
        </div>
    )
}