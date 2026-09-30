'use client';

import { useEffect, useState } from 'react';
import { api, type PageDto } from '@/lib/api';
import BodyEditor from './BodyEditor';

/**
 * Edits one static page (About Me, Contact, ...). Title and body only: the URL is
 * live and the set of pages is fixed by src/lib/pages.ts, so there is no slug,
 * create or delete.
 */
export default function PageEditor({
  slug,
  onSaved,
  onCancel,
}: {
  slug: string;
  onSaved: (page: PageDto) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ title: '', contentHtml: '' });
  const [original, setOriginal] = useState<PageDto | null>(null);
  const [status, setStatus] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStatus(null);
    setLoading(true);
    api
      .getPage(slug)
      .then((page) => {
        setOriginal(page);
        setForm({ title: page.title, contentHtml: page.contentHtml });
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, [slug]);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const saved = await api.savePage(slug, form);
      setOriginal(saved);
      setForm({ title: saved.title, contentHtml: saved.contentHtml });
      setStatus({
        kind: 'ok',
        text: 'Saved. It goes live on the site after Publish site.',
      });
      onSaved(saved);
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="admin-card">Loading…</div>;

  return (
    <div className="admin-card">
      {status && <div className={`alert alert-${status.kind}`}>{status.text}</div>}

      <div className="row">
        <div className="field">
          <label htmlFor="page-title">Title</label>
          <input
            id="page-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div className="hint">
            URL:{' '}
            <a href={original?.url} target="_blank" rel="noreferrer">
              {original?.url}
            </a>{' '}
            — fixed, this page is live.
          </div>
        </div>
      </div>

      {original && (
        <BodyEditor
          value={form.contentHtml}
          savedHtml={original.contentHtml}
          noun="page"
          onChange={(html) => setForm((f) => ({ ...f, contentHtml: html }))}
          onStatus={setStatus}
        />
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" disabled={busy || !original || !form.title} onClick={save}>
          {busy ? 'Working…' : 'Save'}
        </button>
        <button className="btn" onClick={onCancel} disabled={busy}>
          Close
        </button>
      </div>

      {original && (
        <div className="hint" style={{ marginTop: 10 }}>
          {original.toc.length} headings · last modified {original.modified}
          {original.updatedBy ? ` by ${original.updatedBy}` : ''}
        </div>
      )}
    </div>
  );
}
