'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SegmentEditor from './components/TextEditor'

const AdminPage = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('isAdmin')
      if (auth === 'true') setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    if (username === 'race_admin' && password === 'raceauto@2025') {
      localStorage.setItem('isAdmin', 'true')
      setIsAuthenticated(true)
    } else {
      alert('Invalid credentials')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    setIsAuthenticated(false)
    setUsername('')
    setPassword('')
  }

  if (!isAuthenticated) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-body">
                <h3 className="card-title text-center mb-4">Admin Login</h3>
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">
                    Login
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Admin navigation bar — quick access to all CMS sections.
          Highlights the "Manage Users" button for the new user management
          page. Existing admin pages remain accessible from here too. */}
      <div
        style={{
          background: '#0B1228',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#EAF0FF', fontWeight: 600, fontSize: 14 }}>
            Race Auto Analytics — CMS
          </span>
          <Link
            href="/admin/manage-users"
            style={{
              background: '#4F67FF',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(79,103,255,0.35)',
            }}
            title="View, search, and manage users (Google login vs Email+Password)"
          >
            👥 Manage Users
          </Link>
          <Link
            href="/admin/users"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#EAF0FF',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            View Users (legacy)
          </Link>
          <Link
            href="/admin/subscription-reference"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#EAF0FF',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Subscriptions
          </Link>
          <Link
            href="/admin/trial-leads"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#EAF0FF',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Trial Leads
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#FCA5A5',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(239,68,68,0.30)',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      <SegmentEditor />
    </>
  )
}

export default AdminPage
