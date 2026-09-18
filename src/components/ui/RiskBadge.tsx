export function RiskBadge({ level }: { level: 'Low' | 'Moderate' | 'High' }) {
  const styles = { Low: 'bg-emerald-50 text-emerald-700 border-emerald-200', Moderate: 'bg-amber-50 text-amber-700 border-amber-200', High: 'bg-red-50 text-red-700 border-red-200' }
  return <span className={`inline-flex items-center justify-center whitespace-nowrap shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${styles[level]}`}>{level} risk</span>
}
