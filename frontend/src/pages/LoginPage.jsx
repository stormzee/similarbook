import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import './Auth.css'

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  const onSubmit = async (data) => {
    setLoading(true)
    setServerError('')
    try {
      const tokenResp = await api.post('/auth/token',
        new URLSearchParams({ username: data.username, password: data.password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      setTokens(tokenResp.data.access_token, tokenResp.data.refresh_token)
      const meResp = await api.get('/users/me')
      setUser(meResp.data)
      navigate('/feed')
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <h1 className="auth-title">🔗 SimilarBook</h1>
        <p className="muted auth-subtitle">Sign in to your account</p>
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              {...register('username', { required: 'Username is required' })}
              placeholder="your_username"
            />
            {errors.username && <span className="error-text">{errors.username.message}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              placeholder="Your password"
            />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          {serverError && <p className="error-text">{serverError}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch muted">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  )
}
