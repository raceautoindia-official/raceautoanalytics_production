'use client';

import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'raceauto123') {
      setAuthenticated(true);
    } else {
      alert('Invalid credentials');
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, [authenticated]);

  return (
    <div className="container mt-5">
      {!authenticated ? (
        <form onSubmit={handleLogin} className="w-100" style={{ maxWidth: 360 }}>
          <h4 className="mb-4">Admin Login</h4>
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
          <button type="submit" className="btn btn-dark w-100">Login</button>
        </form>
      ) : (
        <>
          <h3 className="mb-4">Users from Database</h3>
          {loading ? (
            <p>Loading...</p>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead className="thead-dark">
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
