import { NavLink } from 'react-router-dom'
import { Users, UserCircle } from 'lucide-react'

const tabs = [
  { to: '/groups', label: 'Groups', Icon: Users },
  { to: '/account', label: 'Account', Icon: UserCircle },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur border-t border-line"
    >
      <div className="max-w-md mx-auto flex px-10 pt-2 pb-[max(1rem,var(--sab))]">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-1 text-xs ${
                isActive ? 'text-teal font-bold' : 'text-muted font-semibold'
              }`
            }
          >
            <Icon size={24} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
