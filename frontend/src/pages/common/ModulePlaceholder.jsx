import Sidebar from '../../components/Sidebar'

function ModulePlaceholder({ title, description = 'This workspace is ready for connected records and authorized actions.' }) {
  return (
    <div className="dashboard-page"><Sidebar /><main className="dashboard-main">
      <header className="dashboard-topbar"><div><p className="dashboard-breadcrumb">Workspace</p><h1>{title}</h1></div></header>
      <div className="dashboard-content"><section className="dashboard-panel"><h3>{title}</h3><p>{description}</p></section></div>
    </main></div>
  )
}

export default ModulePlaceholder
