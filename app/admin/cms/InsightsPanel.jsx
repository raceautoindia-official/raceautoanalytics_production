"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import "react-quill/dist/quill.snow.css";

// react-quill touches `document`, so load it client-only.
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const S3_URL = process.env.NEXT_PUBLIC_S3_BUCKET_URL || "";

function useCrud(endpoint) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  async function upsert(payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to save");
    await refresh();
  }
  async function remove(id) {
    const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to delete");
    await refresh();
  }
  return { rows, loading, refresh, upsert, remove };
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

/* ------------------------------- Categories ------------------------------- */
function CategoriesManager({ onChange }) {
  const api = useCrud("/api/admin/insights/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { title: "Name", dataIndex: "name", key: "name" },
      { title: "Slug", dataIndex: "slug", key: "slug", width: 200 },
      { title: "Order", dataIndex: "sort_order", key: "sort_order", width: 90 },
      {
        title: "Actions",
        key: "actions",
        width: 170,
        render: (_, row) => (
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => {
                setEditing(row);
                form.setFieldsValue(row);
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              danger
              onClick={async () => {
                try {
                  await api.remove(row.id);
                  message.success("Deleted");
                  onChange?.();
                } catch (e) {
                  message.error(String(e.message || e));
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [api, form, onChange],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-black/60">
            Sections shown on posts and the insights index.
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ sort_order: 10 });
            setOpen(true);
          }}
        >
          Add category
        </Button>
      </div>
      <Divider />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={api.rows}
        loading={api.loading}
        pagination={{ pageSize: 10 }}
      />
      <Modal
        title={editing ? "Edit category" : "Add category"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            await api.upsert({ ...values, id: editing?.id });
            message.success("Saved");
            setOpen(false);
            onChange?.();
          } catch (e) {
            if (e?.errorFields) return;
            message.error(String(e.message || e));
          }
        }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., EV Trends" />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort order" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} max={9999} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* --------------------------------- Posts ---------------------------------- */
function PostsManager({ categories, reloadCategories }) {
  const api = useCrud("/api/admin/insights");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bodyHtml, setBodyHtml] = useState("");
  const [coverKey, setCoverKey] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    api.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  function openNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: "draft", author: "Race Auto Analytics" });
    setBodyHtml("");
    setCoverKey(null);
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt || "",
      category_id: row.category_id || undefined,
      tags: row.tags || "",
      country_slug: row.country_slug || "",
      author: row.author || "Race Auto Analytics",
      meta_title: row.meta_title || "",
      meta_description: row.meta_description || "",
      status: row.status || "draft",
      published_at: fmtDate(row.published_at) === "—" ? "" : fmtDate(row.published_at),
    });
    setBodyHtml(row.body_html || "");
    setCoverKey(row.cover_image_key || null);
    setOpen(true);
  }

  async function uploadCover(file) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/insights/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setCoverKey(data.key);
      message.success("Cover uploaded");
    } catch (e) {
      message.error(String(e.message || e));
    } finally {
      setUploading(false);
    }
  }

  const columns = useMemo(
    () => [
      { title: "Title", dataIndex: "title", key: "title" },
      {
        title: "Category",
        dataIndex: "category_name",
        key: "category_name",
        width: 160,
        render: (v) => v || <span className="text-black/30">—</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 110,
        render: (v) =>
          v === "published" ? (
            <Tag color="green">Published</Tag>
          ) : (
            <Tag color="orange">Draft</Tag>
          ),
      },
      {
        title: "Published",
        dataIndex: "published_at",
        key: "published_at",
        width: 120,
        render: (v) => fmtDate(v),
      },
      {
        title: "Actions",
        key: "actions",
        width: 210,
        render: (_, row) => (
          <div className="flex gap-2">
            <a
              href={`/insights/${row.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline text-sm self-center"
            >
              View
            </a>
            <Button size="small" onClick={() => openEdit(row)}>
              Edit
            </Button>
            <Button
              size="small"
              danger
              onClick={async () => {
                try {
                  await api.remove(row.id);
                  message.success("Deleted");
                } catch (e) {
                  message.error(String(e.message || e));
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [api],
  );

  const coverUrl = coverKey ? `${S3_URL}${coverKey}` : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Posts</h2>
          <p className="text-sm text-black/60">
            Publish drives the public /insights blog. Drafts stay hidden.
          </p>
        </div>
        <Button type="primary" onClick={openNew}>
          New post
        </Button>
      </div>
      <Divider />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={api.rows}
        loading={api.loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? "Edit post" : "New post"}
        open={open}
        width={820}
        onCancel={() => setOpen(false)}
        okText={editing ? "Save" : "Create"}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            await api.upsert({
              ...values,
              id: editing?.id,
              body_html: bodyHtml,
              cover_image_key: coverKey,
              published_at: values.published_at || null,
            });
            message.success("Saved");
            setOpen(false);
          } catch (e) {
            if (e?.errorFields) return;
            message.error(String(e.message || e));
          }
        }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g., India Auto Sales June 2026: OEM Share & EV Trends" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="slug"
              label="Slug (optional — auto from title)"
              tooltip="Used in the URL /insights/<slug>. Leave blank to auto-generate."
            >
              <Input placeholder="india-auto-sales-june-2026" />
            </Form.Item>
            <Form.Item name="category_id" label="Category">
              <Select
                allowClear
                options={catOptions}
                placeholder="Pick a category"
              />
            </Form.Item>
          </div>

          <Form.Item name="excerpt" label="Excerpt (summary shown on cards & SEO)">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>

          <Form.Item label="Cover image">
            <div className="flex items-center gap-3">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  uploadCover(file);
                  return false; // handle manually
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {coverKey ? "Replace image" : "Upload image"}
                </Button>
              </Upload>
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt="cover"
                  className="h-12 w-20 rounded object-cover ring-1 ring-black/10"
                />
              )}
            </div>
          </Form.Item>

          <Form.Item label="Body">
            <ReactQuill
              theme="snow"
              value={bodyHtml}
              onChange={setBodyHtml}
              modules={QUILL_MODULES}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="tags" label="Tags (comma-separated)">
              <Input placeholder="EV, OEM share, India" />
            </Form.Item>
            <Form.Item
              name="country_slug"
              label="Linked country (optional slug)"
              tooltip="e.g., india — links this post to a flash country."
            >
              <Input placeholder="india" />
            </Form.Item>
          </div>

          <Form.Item name="author" label="Author">
            <Input placeholder="Race Auto Analytics" />
          </Form.Item>

          <Divider orientation="left" plain>
            SEO overrides (optional)
          </Divider>
          <Form.Item name="meta_title" label="Meta title">
            <Input maxLength={300} placeholder="Falls back to the post title" />
          </Form.Item>
          <Form.Item name="meta_description" label="Meta description">
            <Input.TextArea
              rows={2}
              maxLength={500}
              showCount
              placeholder="Falls back to the excerpt"
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "draft", label: "Draft (hidden)" },
                  { value: "published", label: "Published (live)" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="published_at"
              label="Publish date (YYYY-MM-DD, optional)"
              tooltip="Auto-set to today when you first publish. Set a past/future date to override."
            >
              <Input placeholder="2026-07-16" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

/* --------------------------------- Shell ---------------------------------- */
export default function InsightsPanel() {
  const catApi = useCrud("/api/admin/insights/categories");
  useEffect(() => {
    catApi.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Tabs
        items={[
          {
            key: "posts",
            label: "Posts",
            children: (
              <PostsManager
                categories={catApi.rows}
                reloadCategories={catApi.refresh}
              />
            ),
          },
          {
            key: "categories",
            label: "Categories",
            children: <CategoriesManager onChange={catApi.refresh} />,
          },
        ]}
      />
    </div>
  );
}
