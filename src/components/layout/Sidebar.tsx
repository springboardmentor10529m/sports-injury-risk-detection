import { Activity, BarChart3, Brain, ClipboardList, Database, HeartPulse, Home, Settings, Shield, User, Users, Video } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { Role } from '../../types/user'

const links = {
  athlete: [
    ['Dashboard', '/athlete/dashboard', Home],
    ['My Profile', '/athlete/profile', User],
    ['New Analysis', '/athlete/analysis/new', Video],
    ['Analyses', '/athlete/analyses', ClipboardList],
    ['Progress', '/athlete/progress', BarChart3],
    ['Coaches', '/athlete/coaches', Users],
    ['Reports', '/athlete/reports', Activity],
    ['Settings', '/athlete/settings', Settings],
  ],
  coach: [
    ['Dashboard', '/coach/dashboard', Home],
    ['Coach Profile', '/coach/profile', User],
    ['Athletes', '/coach/athletes', Users],
    ['Invitations', '/coach/invitations', ClipboardList],
    ['Risk Monitoring', '/coach/risk-monitoring', HeartPulse],
    ['Reports', '/coach/reports', Activity],
    ['Settings', '/coach/settings', Settings],
  ],
  admin: [
    ['Dashboard', '/admin/dashboard', Home],
    ['Users', '/admin/users', Users],
    ['Dataset', '/admin/dataset', Database],
    ['Models', '/admin/models', Brain],
    ['System', '/admin/system', Shield],
    ['Audit Logs', '/admin/audit-logs', ClipboardList],
    ['Settings', '/admin/settings', Settings],
  ],
} as const

export function Sidebar({ role }: { role: Role }) {
  return <aside className="fixed bottom-0 left-0 z-20 w-full border-t border-white/70 bg-white/80 backdrop-blur-2xl lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:w-72 lg:border-r lg:border-t-0 lg:p-4"><nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">{links[role].map(([label, href, Icon]) => <NavLink key={href} to={href} className={({ isActive }) => `flex min-w-fit items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-deep-navy text-white' : 'text-text-muted hover:bg-white hover:text-deep-navy'}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav></aside>
}
