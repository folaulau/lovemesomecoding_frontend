'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type CategoryDto, type PostDto } from '@/lib/api';
import RichTextEditor from './RichTextEditor';

/**
 * The visual editor works on a fixed schema, so markup outside it — the
 * `<div class="boldgrid-section">` wrappers WordPress left on migrated posts,
 * inline styles, arbitrary classes — cannot round-trip. Text, headings, lists,
 * tables, links and code blocks all survive; the layout scaffolding does not.
 *
 * Detecting it lets us warn instead of quietly rewriting a 40 KB tutorial.
 */
function hasUnrepresentableMarkup(html: string): boolean {
  const withoutCode = html.replace(/<pre[\s\S]*?<\/pre>/gi, '');
  return /<(div|section|span|figure|iframe)\b/i.test(withoutCode) || /\sstyle="/i.test(withoutCode);
}

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
  const [tab, setTab] = useState<'visual' | 'html' | 'preview'>('visual');
  const [status, setStatus] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const isNew = slug === null;
  const legacyMarkup = useMemo(
    () => hasUnrepresentableMarkup(original?.contentHtml ?? ''),
    [original],
  );

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

  function insert(before: string, after = '') {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setForm((f) => ({ ...f, contentHtml: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  }

  async function uploadImage(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      const result = await api.uploadImage(file);
      insert(`<img src="${result.publicUrl}" alt="" />`);
      setStatus({ kind: 'ok', text: `Uploaded ${file.name}` });
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setBusy(false);
    }
  }

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

      <div className="editor-tabs">
        <button className={tab === 'visual' ? 'active' : ''} onClick={() => setTab('visual')}>
          Visual
        </button>
        <button className={tab === 'html' ? 'active' : ''} onClick={() => setTab('html')}>
          HTML
        </button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      {tab === 'visual' && legacyMarkup && (
        <div className="alert alert-error" role="status">
          <strong>Heads up:</strong> this post carries layout markup from WordPress that the visual
          editor cannot represent. Your text, headings, lists, tables, links and code blocks are all
          preserved, but wrapper elements and inline styles will be dropped <em>once you edit here</em>.
          Nothing changes until you type. Use the <strong>HTML</strong> tab to keep the original markup.
        </div>
      )}

      {tab === 'visual' ? (
        <RichTextEditor
          value={form.contentHtml}
          onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))}
          onUploadImage={async (file) => {
            const result = await api.uploadImage(file);
            return result.publicUrl;
          }}
        />
      ) : tab === 'html' ? (
        <>
          <div className="toolbar">
            <button onClick={() => insert('<h2>', '</h2>')}>H2</button>
            <button onClick={() => insert('<h3>', '</h3>')}>H3</button>
            <button onClick={() => insert('<p>', '</p>')}>Paragraph</button>
            <button onClick={() => insert('<strong>', '</strong>')}>Bold</button>
            <button onClick={() => insert('<ul>\n<li>', '</li>\n</ul>')}>List</button>
            <button
              onClick={() =>
                insert('<pre data-enlighter-language="java"><code>', '</code></pre>')
              }
            >
              Code block
            </button>
            <button onClick={() => insert('<code>', '</code>')}>Inline code</button>
            <label className="btn" style={{ padding: '4px 9px', fontSize: '0.78rem', fontWeight: 400 }}>
              Upload image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="field">
            <textarea
              ref={textarea}
              value={form.contentHtml}
              onChange={(e) => setForm((f) => ({ ...f, contentHtml: e.target.value }))}
              spellCheck={false}
            />
            <div className="hint">
              Code blocks get their language from <code>data-enlighter-language</code> and are
              highlighted at build time.
            </div>
          </div>
        </>
      ) : (
        <div className="preview prose" dangerouslySetInnerHTML={{ __html: form.contentHtml }} />
      )}

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
