import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet } from 'react-router'
import { BookIcon, ChartIcon, HomeIcon, SettingsIcon, WalletIcon } from './icons'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Beranda', icon: HomeIcon },
  { to: '/keuangan', label: 'Keuangan', icon: WalletIcon },
  { to: '/belajar', label: 'Belajar', icon: BookIcon },
  { to: '/laporan', label: 'Laporan', icon: ChartIcon },
]

const SETTINGS_NAV: NavItem = { to: '/pengaturan', label: 'Pengaturan', icon: SettingsIcon }

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text'
        }`
      }
    >
      <Icon className="size-5" />
      {item.label}
    </NavLink>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (laptop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-semibold tracking-tight">
          Ulul <span className="text-primary">Hub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Navigasi utama">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <SidebarLink item={SETTINGS_NAV} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header (HP) */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <span className="py-3 text-base font-semibold tracking-tight">
            Ulul <span className="text-primary">Hub</span>
          </span>
          <NavLink
            to={SETTINGS_NAV.to}
            aria-label="Pengaturan"
            className={({ isActive }) =>
              `-mr-2 rounded-lg p-2 ${isActive ? 'text-primary' : 'text-muted hover:text-text'}`
            }
          >
            <SettingsIcon className="size-5" />
          </NavLink>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Navigasi bawah (HP) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigasi utama"
      >
        {MAIN_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium select-none ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              <Icon className="size-6" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
