'use client'

import { useState, useEffect } from 'react'
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

      <SegmentEditor />

  )
}

export default AdminPage
