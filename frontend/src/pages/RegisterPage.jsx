import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { generateKeyPair } from '../utils/crypto'
import './Auth.css'

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  const onSubmit = async (data) => {
    setLoading(true)
    setServerError('')
    try {
      // Generate NaCl key pair – private key stored locally
      const publicKey = generateKeyPair()

      await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        display_name: data.display_name || undefined,
        public_key: publicKey,
      })

      // Auto-login
      const tokenResp = await api.post('/auth/token',
        new URLSearchParams({ username: data.username, password: data.password }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      setTokens(tokenResp.data.access_token, tokenResp.data.refresh_token)

      const meResp = await api.get('/users/me')
      setUser(meResp.data)
      navigate('/feed')
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <h1 className="auth-title">🔗 Join SimilarBook</h1>
        <p className="muted auth-subtitle">Find people working on similar goals</p>
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'Min 3 characters' },
                maxLength: { value: 50, message: 'Max 50 characters' },
                pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Only letters, numbers, underscores' },
              })}
              placeholder="your_username"
            />
            {errors.username && <span className="error-text">{errors.username.message}</span>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              placeholder="you@example.com"
            />
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Display Name (optional)</label>
            <input {...register('display_name')} placeholder="Your Name" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
              })}
              placeholder="Min 8 characters"
            />
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>
          {serverError && <p className="error-text">{serverError}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-security muted">
          🔒 Your encryption keys are generated locally and never leave your device.
        </p>
      </div>
    </div>
  )
}
