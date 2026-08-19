import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'
import '../Dashboard.css'
import '../AthletePages.css'
import './AthleteProfile.css'

function AthleteProfile() {
  const { currentUser, userName, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', height: '', weight: '' })

  const organizationName = currentUser?.organizationName?.trim() || null
  const hasOrganization = Boolean(currentUser?.organizationId && organizationName)
  const profile = {
    name: currentUser?.name || userName || 'Athlete',
    email: currentUser?.email || 'Not provided',
    phone: currentUser?.phone || 'Not provided',
    address: currentUser?.address || 'Not provided',
    height: currentUser?.height || 'Not provided',
    weight: currentUser?.weight || 'Not provided',
    sport: currentUser?.sport || 'Not specified',
  }
  const membership = hasOrganization ? 'Verified · Active' : 'Independent'

  useEffect(() => {
    setForm({
      name: currentUser?.name || userName || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      height: currentUser?.height || '',
      weight: currentUser?.weight || '',
    })
  }, [currentUser, userName])

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSave = () => {
    updateProfile(form)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setForm({
      name: currentUser?.name || userName || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      height: currentUser?.height || '',
      weight: currentUser?.weight || '',
    })
    setIsEditing(false)
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-topbar"><div><p className="dashboard-breadcrumb">My Account / Profile</p><h1>My Profile</h1></div></header>
        <div className="dashboard-content athlete-profile-content">
          <section className="profile-header-card athlete-own-profile-header">
            <div className="profile-main-info"><div className="profile-large-avatar">{profile.name.charAt(0).toUpperCase()}</div><div><p className="profile-id">PERSONAL ATHLETE ACCOUNT</p><h2>{profile.name}</h2><p className="profile-sport">{profile.sport} · Athlete</p></div></div>
          </section>
          <section className="athlete-profile-grid">
            <div className="dashboard-panel"><div className="panel-header"><div><h3>Personal Information</h3><p>Your personal account details.</p></div>{isEditing ? null : <button className="text-button" type="button" onClick={() => setIsEditing(true)}>Edit Profile</button>}</div>{isEditing ? <div className="athlete-profile-form"><div className="athlete-profile-form-grid"><div className="athlete-form-group"><label htmlFor="profile-name">Full Name</label><input id="profile-name" type="text" value={form.name} onChange={handleFormChange('name')} placeholder="Enter your full name" /></div><div className="athlete-form-group"><label htmlFor="profile-email">Email</label><div className="athlete-profile-readonly"><strong>{profile.email}</strong><span>Read-only</span></div></div><div className="athlete-form-group"><label htmlFor="profile-phone">Phone</label><input id="profile-phone" type="text" value={form.phone} onChange={handleFormChange('phone')} placeholder="Enter your phone number" /></div><div className="athlete-form-group"><label htmlFor="profile-height">Height</label><input id="profile-height" type="text" value={form.height} onChange={handleFormChange('height')} placeholder="e.g., 178 cm" /></div><div className="athlete-form-group athlete-form-group-full"><label htmlFor="profile-address">Address</label><input id="profile-address" type="text" value={form.address} onChange={handleFormChange('address')} placeholder="Enter your address" /></div><div className="athlete-form-group"><label htmlFor="profile-weight">Weight</label><input id="profile-weight" type="text" value={form.weight} onChange={handleFormChange('weight')} placeholder="e.g., 72 kg" /></div></div><div className="athlete-profile-form-actions"><button className="athlete-secondary-button" type="button" onClick={handleCancel}>Cancel</button><button className="athlete-primary-button" type="button" onClick={handleSave}>Save Changes</button></div></div> : <div className="profile-details-grid athlete-profile-details"><div><span>Full Name</span><strong>{profile.name}</strong></div><div><span>Email</span><strong>{profile.email}</strong><small className="athlete-readonly-hint">Read-only</small></div><div><span>Phone</span><strong>{profile.phone}</strong></div><div><span>Address</span><strong>{profile.address}</strong></div><div><span>Height</span><strong>{profile.height}</strong></div><div><span>Weight</span><strong>{profile.weight}</strong></div></div>}</div>
            <div className="dashboard-panel"><div className="panel-header"><div><h3>Sports Information</h3><p>Your sport and organization affiliation.</p></div></div><div className="profile-details-grid athlete-profile-details athlete-profile-summary"><div><span>Sport</span><strong>{profile.sport}</strong></div><div><span>Organization</span><strong>{hasOrganization ? organizationName : 'Nothing'}</strong></div><div><span>Membership Status</span><strong>{membership}</strong></div></div></div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AthleteProfile
