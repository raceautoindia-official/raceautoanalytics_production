"use client";

/**
 * /admin/manage-users — full user management dashboard for Race Auto Analytics.
 * Shows every user from the local `users` table with derived `loginType`
 * (Google vs Email+Password), session status, trial status, verification
 * status. Search + filter + per-row "Clear Session" admin action.
 *
 * Auth gate matches the existing admin convention (/admin/users uses the same
 * hardcoded credentials pattern). Replace with proper SSO when ready.
 */

import { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "raceauto123";
const SESSION_KEY = "raceauto_manage_users_admin";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoginTypeBadge({ type }) {
  if (type === "google") {
    return (
      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
        Google login
      </span>
    );
  }
  return (
    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
      Email + Password
    </span>
  );
}

function StatusBadge({ status, trueLabel, falseLabel }) {
  return status ? (
    <span className="badge bg-success-subtle text-success border border-success-subtle">
      {trueLabel}
    </span>
  ) : (
    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
      {falseLabel}
    </span>
  );
}

function SessionBadge({ status }) {
  if (status === "active") {
    return (
      <span className="badge bg-success-subtle text-success border border-success-subtle">
        Active
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
        Expired
      </span>
    );
  }
  return (
    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
      None
    </span>
  );
}

function TrialBadge({ status }) {
  if (status === "active") {
    return (
      <span className="badge bg-info-subtle text-info border border-info-subtle">
        Active
      </span>
    );
  }
  if (status === "used" || status === "expired") {
    return (
      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
        Used
      </span>
    );
  }
  return (
    <span className="badge bg-light text-secondary border">Never</span>
  );
}

export default function ManageUsersPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [loginTypeFilter, setLoginTypeFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const [clearingId, setClearingId] = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  // Restore session-scoped admin auth on mount (same UX as the other admin
  // pages but uses sessionStorage so closing the tab forces re-login).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
      setAuthenticated(true);
    }
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    if (
      usernameInput.trim() === ADMIN_USERNAME &&
      passwordInput === ADMIN_PASSWORD
    ) {
      setAuthenticated(true);
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      setAuthError("Invalid credentials");
    }
  }

  function handleLogout() {
    setAuthenticated(false);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUsernameInput("");
    setPasswordInput("");
  }

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users-overview", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Fetch failed");
      setUsers(Array.isArray(data.users) ? data.users : []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err?.message || "Failed to fetch users");
      setUsers([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) fetchUsers();
  }, [authenticated]);

  async function handleClearSession(id) {
    if (!id) return;
    if (!confirm("Force-clear this user's session lock? They will need to log in again.")) {
      return;
    }
    setClearingId(id);
    try {
      const res = await fetch("/api/admin/clear-user-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      // Refresh the list so the row reflects the cleared session
      await fetchUsers();
    } catch (err) {
      alert(`Failed to clear session: ${err?.message || "unknown error"}`);
    } finally {
      setClearingId(null);
    }
  }

  // Filtered list — applies search + login-type + verification filters
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const haystack = [u.email, u.mobile_number, String(u.id)]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" | ");
        if (!haystack.includes(q)) return false;
      }
      if (loginTypeFilter !== "all" && u.loginType !== loginTypeFilter) {
        return false;
      }
      if (verificationFilter === "verified" && !u.emailVerifiedBool && !u.phoneVerifiedBool) {
        return false;
      }
      if (verificationFilter === "unverified" && (u.emailVerifiedBool || u.phoneVerifiedBool)) {
        return false;
      }
      return true;
    });
  }, [users, search, loginTypeFilter, verificationFilter]);

  if (!authenticated) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h4 className="card-title text-center mb-4">
                  Admin Login — Manage Users
                </h4>
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                    />
                  </div>
                  {authError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      {authError}
                    </div>
                  )}
                  <button type="submit" className="btn btn-dark w-100">
                    Login
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <div>
          <h3 className="mb-1">Manage Users</h3>
          <p className="text-muted mb-0 small">
            Race Auto Analytics — local user table overview &amp; admin actions
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={fetchUsers}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Total users</div>
              <div className="fs-4 fw-semibold">{stats.total}</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Google login</div>
              <div className="fs-4 fw-semibold text-danger">{stats.googleLogin}</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Email + Password</div>
              <div className="fs-4 fw-semibold text-primary">{stats.emailPasswordLogin}</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Email verified</div>
              <div className="fs-4 fw-semibold text-success">{stats.emailVerified}</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Active sessions</div>
              <div className="fs-4 fw-semibold">{stats.activeSession}</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="border rounded-3 p-3 bg-light">
              <div className="text-muted small">Trials used</div>
              <div className="fs-4 fw-semibold">{stats.trialUsed}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="row g-2 mb-3">
        <div className="col-md-5">
          <input
            type="search"
            className="form-control"
            placeholder="Search by email, mobile, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={loginTypeFilter}
            onChange={(e) => setLoginTypeFilter(e.target.value)}
          >
            <option value="all">All login types</option>
            <option value="google">Google login only</option>
            <option value="email_password">Email + Password only</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            <option value="all">All verification states</option>
            <option value="verified">Verified (email or phone)</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
        <div className="col-md-1 d-flex align-items-center text-muted small">
          {filteredUsers.length} / {users.length}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={fetchUsers}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading users…</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-muted">No users match the current filters.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Login type</th>
                <th>Mobile</th>
                <th>Verified</th>
                <th>Session</th>
                <th>Trial</th>
                <th>Last login</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="text-muted small">{u.id}</td>
                  <td>
                    <div className="fw-semibold">{u.email}</div>
                    {u.welcome_email_sent_at && (
                      <div className="text-muted x-small" style={{ fontSize: "0.7rem" }}>
                        Welcome sent {formatDateTime(u.welcome_email_sent_at)}
                      </div>
                    )}
                  </td>
                  <td>
                    <LoginTypeBadge type={u.loginType} />
                    {u.verification_mode && (
                      <div
                        className="text-muted mt-1"
                        style={{ fontSize: "0.7rem" }}
                      >
                        Mode: {u.verification_mode}
                      </div>
                    )}
                  </td>
                  <td className="small">{u.mobile_number || "—"}</td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <StatusBadge
                        status={u.emailVerifiedBool}
                        trueLabel="Email ✓"
                        falseLabel="Email ✗"
                      />
                      <StatusBadge
                        status={u.phoneVerifiedBool}
                        trueLabel="Phone ✓"
                        falseLabel="Phone ✗"
                      />
                    </div>
                  </td>
                  <td>
                    <SessionBadge status={u.sessionStatus} />
                    {u.session_expires_at && (
                      <div
                        className="text-muted mt-1"
                        style={{ fontSize: "0.7rem" }}
                      >
                        Expires {formatDateTime(u.session_expires_at)}
                      </div>
                    )}
                  </td>
                  <td>
                    <TrialBadge status={u.trialStatus} />
                  </td>
                  <td className="small text-muted">
                    {formatDateTime(u.last_login_at)}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => setDetailUser(u)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => handleClearSession(u.id)}
                      disabled={clearingId === u.id || u.sessionStatus !== "active"}
                      title={
                        u.sessionStatus === "active"
                          ? "Force-clear the session lock so the user can log in again"
                          : "No active session to clear"
                      }
                    >
                      {clearingId === u.id ? "Clearing…" : "Clear session"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detailUser && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setDetailUser(null)}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">User detail — {detailUser.email}</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setDetailUser(null)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Login type:</strong>{" "}
                  <LoginTypeBadge type={detailUser.loginType} />
                </div>
                <table className="table table-sm">
                  <tbody>
                    {Object.entries(detailUser).map(([k, v]) => (
                      <tr key={k}>
                        <td className="text-muted" style={{ width: "40%" }}>
                          {k}
                        </td>
                        <td className="font-monospace small">
                          {v === null || v === undefined
                            ? "—"
                            : typeof v === "boolean"
                              ? String(v)
                              : typeof v === "object"
                                ? JSON.stringify(v)
                                : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDetailUser(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
