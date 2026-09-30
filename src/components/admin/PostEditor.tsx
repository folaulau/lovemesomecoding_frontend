'use client';

import { useEffect, useState } from 'react';
import { api, type CategoryDto, type PostDto } from '@/lib/api';
import BodyEditor from './BodyEditor';

const BLANK = {
  slug: '',
  title: '',
  category: '',
  contentHtml: '',
  tags: [] as string[],
  status: 'draft',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function PostEditor({
  slug,
  categories,
  onSaved,
  onDeleted,
  onCancel,
}: {
  slug: string | null;
  categories: CategoryDto[];
  onSaved: (post: PostDto) => void;
  onDeleted: (slug: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...BLANK });
  const [original, setOriginal] = useState<PostDto | null>(null);
  const [status, setStatus] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const isNew = slug === null;

  useEffect(() => {
    setStatus(null);
    if (slug === null) {
      setForm({ ...BLANK, category: categories[0]?.slug ?? '' });
      setOriginal(null);
      return;
    }
    setLoading(true);
    api
      .getPost(slug)
      .then((post) => {
        setOriginal(post);
        setForm({
          slug: post.slug,
          title: post.title,
          category: post.category,
          contentHtml: post.contentHtml,
          tags: post.tags ?? [],
          status: post.status ?? 'published',
        });
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [slug, categories]);

  async function save(publish: boolean) {
    setBusy(true);
    setStatus(null);
    try {
      const saved = await api.savePost({
        slug: form.slug,
        title: form.title,
        category: form.category,
        contentHtml: form.contentHtml,
        tags: form.tags,
        status: publish ? 'published' : 'draft',
      });
      setOriginal(saved);
      setForm((f) => ({ ...f, status: saved.status ?? 'published' }));
      setStatus({ kind: 'ok', text: publish ? 'Saved and published' : 'Saved as draft' });
      onSaved(saved);
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!original) return;
    if (!window.confirm(`Delete "${original.title}"? This removes the live URL ${original.url}.`)) {
      return;
    }
    setBusy(true);
    try {
      await api.deletePost(original.slug);
      onDeleted(original.slug);
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
      setBusy(false);
    }
  }

  if (loading) return <div className="admin-card">Loading…</div>;

  return (
    <div className="admin-card">
      {status && <div className={`alert alert-${status.kind}`}>{status.text}</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({
                ...f,
                title,
                // Only auto-derive the slug for a new post; changing an existing
                // slug would break a URL that is already indexed.
                slug: isNew && !original ? slugify(title) : f.slug,
              }));
            }}
          />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            value={form.slug}
            disabled={!isNew}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
          />
          <div className="hint">
            {isNew ? 'Becomes part of the URL — cannot be changed later.' : 'Fixed: this URL is live.'}
          </div>
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="tags">Tags</label>
        <input
          id="tags"
          value={form.tags.join(', ')}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              tags: e.target.value.split(',').map((t) => slugify(t)).filter(Boolean),
            }))
          }
        />
        <div className="hint">Comma separated. URL: /{form.category}/{form.slug || '…'}</div>
      </div>

      <BodyEditor
        value={form.contentHtml}
        savedHtml={original?.contentHtml ?? ''}
        noun="post"
        onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))}
        onStatus={setStatus}
      />

      <div className="row" style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary"
          disabled={busy || !form.slug || !form.title || !form.category}
          onClick={() => save(true)}
        >
          {busy ? 'Working…' : 'Save & publish'}
        </button>
        <button className="btn" disabled={busy || !form.slug || !form.title} onClick={() => save(false)}>
          Save draft
        </button>
        <button className="btn" onClick={onCancel} disabled={busy}>
          Close
        </button>
        {original && (
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            Delete
          </button>
        )}
      </div>

      {original && (
        <div className="hint" style={{ marginTop: 10 }}>
          {original.wordCount} words · {original.readingMinutes} min ·{' '}
          {original.toc.length} headings · last modified {original.modified}
        </div>
      )}
    </div>
  );
}
