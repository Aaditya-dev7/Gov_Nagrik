import type { ComponentType } from 'react'
import { Home, FileText, Map, Settings, User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type Props = {
  currentPage: string
  onNavigate: (page: string) => void
}

const items: Array<{ id: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'logout', label: 'Logout', icon: LogOut },
]

function MobileBottomNav({ currentPage, onNavigate }: Props) {
  const { logout } = useAuth()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="mx-auto max-w-xl grid grid-cols-5 gap-1 px-2 py-2">
        {items.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          return (
            <li key={id} className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (id === 'logout') { logout(); return }
                  onNavigate(id)
                }}
                className={[
                  'flex flex-col items-center justify-center rounded-full px-3 py-1.5 text-[11px] leading-tight',
                  active ? 'text-orange-600' : 'text-slate-600',
                ].join(' ')}
                aria-current={id !== 'logout' && active ? 'page' : undefined}
              >
                <Icon className={[
                  'h-5 w-5',
                  active ? 'text-orange-600' : 'text-slate-600',
                ].join(' ')} />
                <span className="mt-0.5">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default MobileBottomNav
export { MobileBottomNav }
