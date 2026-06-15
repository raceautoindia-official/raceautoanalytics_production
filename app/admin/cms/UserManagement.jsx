// CMS panel: Race Auto Analytics user management.
//
// Replaces the standalone /admin/users + /admin/manage-users pages (which had
// their own client-side logins) — this lives inside the CMS, already gated by
// the /admin middleware Basic-Auth. Built with Ant Design to match the rest of
// the CMS (the old page used Bootstrap, which would clash with Ant globally).
//
// Reads the safe /api/admin/users-overview (no secrets). Per-row actions:
//   - Clear session  → /api/admin/clear-user-session
//   - Delete         → /api/admin/delete-user (blocked if the email still
//                       exists in the Race Auto India DB)
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Modal,
  Tooltip,
  message,
} from "antd";

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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [loginTypeFilter, setLoginTypeFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const [clearingId, setClearingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users-overview", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setUsers(Array.isArray(data.users) ? data.users : []);
      setStats(data.stats || null);
    } catch (err) {
      message.error(err?.message || "Failed to fetch users");
      setUsers([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleClearSession(id) {
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
      message.success("Session cleared");
      await fetchUsers();
    } catch (err) {
      message.error(`Failed to clear session: ${err?.message || "unknown error"}`);
    } finally {
      setClearingId(null);
    }
  }

  async function performDelete(user) {
    setDeletingId(user.id);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        message.success(`Deleted ${user.email}`);
        await fetchUsers();
        return;
      }

      // Blocked because the email still exists in Race Auto India.
      if (res.status === 409 || data?.code === "RAI_PRESENT") {
        Modal.warning({
          title: "Cannot delete — still in Race Auto India",
          content:
            data?.message ||
            "This email is present in the Race Auto India database. Please remove it there first, then you can delete it here.",
        });
        return;
      }

      // Could not verify against RAI → blocked for safety.
      if (res.status === 503 || data?.code === "RAI_UNVERIFIED") {
        message.warning(
          data?.message ||
            "Could not verify against the Race Auto India database. Please try again.",
        );
        return;
      }

      throw new Error(data?.message || `HTTP ${res.status}`);
    } catch (err) {
      message.error(`Failed to delete: ${err?.message || "unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(user) {
    Modal.confirm({
      title: "Delete this user?",
      content: (
        <span>
          This permanently removes <strong>{user.email}</strong> from the local
          users table. It is blocked if the email still exists in the Race Auto
          India database.
        </span>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () => performDelete(user),
    });
  }

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
      if (loginTypeFilter !== "all" && u.loginType !== loginTypeFilter) return false;
      if (
        verificationFilter === "verified" &&
        !u.emailVerifiedBool &&
        !u.phoneVerifiedBool
      ) {
        return false;
      }
      if (
        verificationFilter === "unverified" &&
        (u.emailVerifiedBool || u.phoneVerifiedBool)
      ) {
        return false;
      }
      return true;
    });
  }, [users, search, loginTypeFilter, verificationFilter]);

  const columns = [
    { title: "ID", dataIndex: "id", width: 70, sorter: (a, b) => a.id - b.id },
    {
      title: "Email",
      dataIndex: "email",
      render: (email) => <span style={{ fontWeight: 600 }}>{email}</span>,
    },
    {
      title: "Login type",
      dataIndex: "loginType",
      width: 150,
      render: (type) =>
        type === "google" ? (
          <Tag color="red">Google login</Tag>
        ) : (
          <Tag color="blue">Email + Password</Tag>
        ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile_number",
      width: 140,
      render: (m) => m || "—",
    },
    {
      title: "Verified",
      width: 120,
      render: (_, u) => (
        <Space direction="vertical" size={2}>
          <Tag color={u.emailVerifiedBool ? "green" : "default"}>
            Email {u.emailVerifiedBool ? "✓" : "✗"}
          </Tag>
          <Tag color={u.phoneVerifiedBool ? "green" : "default"}>
            Phone {u.phoneVerifiedBool ? "✓" : "✗"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Session",
      dataIndex: "sessionStatus",
      width: 110,
      render: (s) =>
        s === "active" ? (
          <Tag color="green">Active</Tag>
        ) : s === "expired" ? (
          <Tag color="orange">Expired</Tag>
        ) : (
          <Tag>None</Tag>
        ),
    },
    {
      title: "Trial",
      dataIndex: "trialStatus",
      width: 100,
      render: (s) =>
        s === "active" ? (
          <Tag color="cyan">Active</Tag>
        ) : s === "used" || s === "expired" ? (
          <Tag>Used</Tag>
        ) : (
          <Tag>Never</Tag>
        ),
    },
    {
      title: "Last login",
      dataIndex: "last_login_at",
      width: 160,
      render: (v) => <span style={{ fontSize: 12 }}>{formatDateTime(v)}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 250,
      render: (_, u) => (
        <Space>
          <Button size="small" onClick={() => setDetailUser(u)}>
            View
          </Button>
          <Tooltip
            title={
              u.sessionStatus === "active"
                ? "Force-clear the session lock so the user can log in again"
                : "No active session to clear"
            }
          >
            <Button
              size="small"
              loading={clearingId === u.id}
              disabled={u.sessionStatus !== "active"}
              onClick={() => handleClearSession(u.id)}
            >
              Clear session
            </Button>
          </Tooltip>
          <Button
            size="small"
            danger
            loading={deletingId === u.id}
            onClick={() => confirmDelete(u)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>User Management</h3>
          <div style={{ color: "#888", fontSize: 13 }}>
            Local user table overview &amp; admin actions. Delete is blocked
            while the email still exists in the Race Auto India database.
          </div>
        </div>
        <Button onClick={fetchUsers} loading={loading}>
          Refresh
        </Button>
      </div>

      {stats && (
        <Space wrap style={{ marginBottom: 16 }}>
          <Tag>Total: {stats.total}</Tag>
          <Tag color="red">Google: {stats.googleLogin}</Tag>
          <Tag color="blue">Email+Pwd: {stats.emailPasswordLogin}</Tag>
          <Tag color="green">Email verified: {stats.emailVerified}</Tag>
          <Tag>Active sessions: {stats.activeSession}</Tag>
          <Tag>Trials used: {stats.trialUsed}</Tag>
        </Space>
      )}

      <Space wrap style={{ marginBottom: 16, width: "100%" }}>
        <Input.Search
          placeholder="Search by email, mobile, or ID…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
        <Select
          value={loginTypeFilter}
          onChange={setLoginTypeFilter}
          style={{ width: 200 }}
          options={[
            { value: "all", label: "All login types" },
            { value: "google", label: "Google login only" },
            { value: "email_password", label: "Email + Password only" },
          ]}
        />
        <Select
          value={verificationFilter}
          onChange={setVerificationFilter}
          style={{ width: 220 }}
          options={[
            { value: "all", label: "All verification states" },
            { value: "verified", label: "Verified (email or phone)" },
            { value: "unverified", label: "Unverified" },
          ]}
        />
        <span style={{ color: "#888", fontSize: 13 }}>
          {filteredUsers.length} / {users.length}
        </span>
      </Space>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filteredUsers}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 25, showSizeChanger: true }}
      />

      <Modal
        open={!!detailUser}
        title={detailUser ? `User detail — ${detailUser.email}` : ""}
        footer={null}
        onCancel={() => setDetailUser(null)}
        width={700}
      >
        {detailUser && (
          <table style={{ width: "100%", fontSize: 13 }}>
            <tbody>
              {Object.entries(detailUser).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: "#888", width: "40%", padding: "4px 8px" }}>
                    {k}
                  </td>
                  <td style={{ fontFamily: "monospace", padding: "4px 8px" }}>
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
        )}
      </Modal>
    </div>
  );
}
