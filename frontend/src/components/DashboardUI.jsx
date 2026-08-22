import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import './DashboardUI.css'

export function DashboardShell({ title, breadcrumb = 'Workspace', children, action }) {
  const { currentUser, userName } = useAuth()
  return <div className="dashboard-page"><Sidebar /><main className="dashboard-main"><header className="dashboard-topbar"><div><p className="dashboard-breadcrumb">{breadcrumb}</p><h1>{title}</h1></div><div className="dashboard-user"><div className="user-avatar">{userName?.charAt(0).toUpperCase() || 'U'}</div><div className="user-info"><strong>{userName || 'User'}</strong><small>{currentUser?.role || 'Account'}</small></div></div></header><div className="dashboard-content">{action && <div className="dashboard-page-actions">{action}</div>}{children}</div></main></div>
}

export function StatCard({ label, value = '0', detail, icon = '•', tone = 'blue' }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div className="stat-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}

export function Panel({ title, description, children, action }) {
  return <section className="dashboard-panel feature-panel"><div className="panel-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>
}

export function ChartPanel({ title, description }) {
  return <section className="dashboard-panel chart-placeholder"><div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div><span className="chart-label">No data</span></div><div className="chart-placeholder-body"><span className="chart-axis chart-axis-y" /><span className="chart-axis chart-axis-x" /><span className="chart-placeholder-icon">⌁</span><strong>No data available yet</strong><small>Chart data will appear when connected records exist.</small></div></section>
}

export function EmptyState({ title, description, action, icon = '◌' }) {
  return <div className="empty-state"><span className="empty-state-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function SearchFilterBar({ placeholder = 'Search records...', children }) {
  return <div className="search-filter-bar"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder={placeholder} /></label>{children}</div>
}

export function StatusBadge({ children, tone = 'neutral' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

export function DataTable({ columns, rows = [], emptyTitle = 'No records yet', emptyDescription = 'Records will appear here when they are available.' }) {
  return rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div> : <EmptyState title={emptyTitle} description={emptyDescription} />
}

export function ActionButton({ children, to, onClick, secondary = false, type = 'button' }) {
  const className = `action-button ${secondary ? 'secondary' : ''}`
  return to ? <Link className={className} to={to}>{children}</Link> : <button className={className} type={type} onClick={onClick}>{children}</button>
}
