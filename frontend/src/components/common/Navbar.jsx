import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      try { await api.post('/auth/logout', { refresh_token: refreshToken }) } catch {}
    }
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">🔗</span> SimilarBook
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/feed">Feed</Link>
            <Link to="/search">Search</Link>
            <Link to="/tasks/new">+ Task</Link>
            <Link to="/connections">Connections</Link>
            <Link to="/messages">Messages</Link>
            <Link to={`/profile/${user.username}`}>{user.display_name || user.username}</Link>
            <button className="btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  )
}
