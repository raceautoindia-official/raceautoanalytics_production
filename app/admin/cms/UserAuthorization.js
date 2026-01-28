"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  List,
  message,
  Space,
  Table,
  Select,
  Modal,
  Row,
  Col,
} from "antd";

export default function UserAuthorization() {
  const [form] = Form.useForm();
  const [countries, setCountries] = useState([]);
  const [users, setUsers] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newCountryId, setNewCountryId] = useState(null);

  const loadCountries = async () => {
    try {
      const res = await fetch("/api/availableCountries");
      const data = await res.json();
      setCountries(data);
    } catch {
      message.error("Failed to load countries");
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/user-country");
      const data = await res.json();
      setUsers(data);
    } catch {
      message.error("Failed to load user data");
    }
  };

  useEffect(() => {
    loadCountries();
    loadUsers();
  }, []);

  const handleSubmit = async ({ name, code }) => {
    try {
      const res = await fetch("/api/availableCountries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ name, code }),
      });
      if (!res.ok) throw new Error("Failed to add");
      message.success("Country added");
      form.resetFields();
      loadCountries();
    } catch {
      message.error("Failed to add country");
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setNewCountryId(user.country_id);
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    try {
      const res = await fetch("/api/user-country", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          email: editingUser.email,
          plan_name: editingUser.plan_name,
          country_id: newCountryId,
        }),
      });
      if (!res.ok) throw new Error();
      message.success("Country updated");
      setEditModalVisible(false);
      loadUsers();
    } catch {
      message.error("Failed to update");
    }
  };

  const countryOptions = countries.map((c) => ({
    label: `${c.name}${c.code ? ` (${c.code})` : ""}`,
    value: c.id,
  }));

  const userColumns = [
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Plan", dataIndex: "plan_name", key: "plan_name" },
    { title: "Country", dataIndex: "country_name", key: "country_name" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => openEditModal(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={24}>
        {/* Left Column: Country Management */}
        <Col span={10}>
          <h3>Manage Available Countries</h3>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="Country Name"
              rules={[{ required: true }]}
            >
              <Input placeholder="e.g. India" />
            </Form.Item>
            <Form.Item name="code" label="Country Code (Optional)">
              <Input placeholder="e.g. IN" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Country
              </Button>
            </Form.Item>
          </Form>

          <List
            size="small"
            header={<strong>Available Countries</strong>}
            dataSource={countries}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  {item.name} {item.code && <em>({item.code})</em>}
                </Space>
              </List.Item>
            )}
          />
        </Col>

        {/* Right Column: User Table */}
        <Col span={14}>
          <h3>User Details</h3>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="email"
            pagination={{ pageSize: 5 }}
          />
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditSave}
        title={`Edit Country for ${editingUser?.email}`}
      >
        <Select
          style={{ width: "100%" }}
          options={countryOptions}
          value={newCountryId}
          onChange={setNewCountryId}
        />
      </Modal>
    </div>
  );
}
