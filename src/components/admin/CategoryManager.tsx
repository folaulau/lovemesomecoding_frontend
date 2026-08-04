'use client';

import { useState } from 'react';
import { api, type CategoryDto } from '@/lib/api';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export default function CategoryManager({
  categories,
  onChanged,
  onClose,
}: {
  categories: CategoryDto[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ slug: '', name: '', description: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      await api.saveCategory(form);
      setStatus({ kind: 'ok', text: `Saved "${form.name}"` });
      setForm({ slug: '', name: '', description: '' });
      setEditing(null);
      onChanged();
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: CategoryDto) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.deleteCategory(category.slug);
      setStatus({ kind: 'ok', text: `Deleted "${category.name}"` });
      onChanged();
    } catch (err) {
      // The API refuses to delete a category that still holds posts — those URLs are live.
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-bar">
        <h1>Categories</h1>
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      {status && <div className={`alert alert-${status.kind}`}>{status.text}</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="cat-name">Name</label>
          <input
            id="cat-name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: editing ? f.slug : slugify(name) }));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="cat-slug">Slug</label>
          <input
            id="cat-slug"
            value={form.slug}
            disabled={Boolean(editing)}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cat-desc">Description</label>
        <input
          id="cat-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="hint">Shown on /{form.slug || '…'} above the tutorial list.</div>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !form.slug || !form.name} onClick={save}>
          {editing ? 'Update category' : 'Add category'}
        </button>
        {editing && (
          <button
            className="btn"
            onClick={() => {
              setEditing(null);
              setForm({ slug: '', name: '', description: '' });
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="post-rows" style={{ marginTop: 20 }}>
        {categories.map((category) => (
          <div key={category.slug} className="post-row" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="t">{category.name}</div>
              <div className="m">/{category.slug} · {category.count} posts</div>
            </div>
            <button
              className="btn"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                setEditing(category.slug);
                setForm({
                  slug: category.slug,
                  name: category.name,
                  description: category.description ?? '',
                });
              }}
            >
              Edit
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              disabled={busy}
              onClick={() => remove(category)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
