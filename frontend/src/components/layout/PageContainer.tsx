import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Chatbot } from '../ui/Chatbot'
import { BackgroundTexture } from './BackgroundTexture'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

export function PageContainer() {
  const { user } = useAuth()
  return <><BackgroundTexture /><Navbar /><div className="lg:flex">{user && <Sidebar role={user.role} />}<main className="min-h-[calc(100vh-73px)] flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10"><Outlet /></main></div><Chatbot /></>
}

