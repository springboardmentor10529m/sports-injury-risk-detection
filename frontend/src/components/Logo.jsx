import { Link } from 'react-router-dom'
import logoMark from '../assets/sports-injury-logo.svg'

function Logo({ compact = false, linked = false, className = '' }) {
  const content = <><img className="brand-mark" src={logoMark} alt="" /><span className="brand-wordmark"><strong>Sports Injury</strong><span>Risk Prediction</span></span></>
  const logo = <span className={`app-logo ${compact ? 'app-logo-compact' : ''} ${className}`.trim()}>{content}</span>

  return linked ? <Link to="/" className="app-logo-link">{logo}</Link> : logo
}

export default Logo
