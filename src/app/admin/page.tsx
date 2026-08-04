'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Login from '@/components/admin/Login';
import PostEditor from '@/components/admin/PostEditor';
import CategoryManager from '@/components/admin/CategoryManager';
import { api, auth, type AdminUser, type CategoryDto, type PostSummaryDto } from '@/lib/api';

/**
 * Single-page admin console.
 *
 * All view state lives in this component rather than in routes, because the site
 * is a static export — dynamic admin routes would need to be prerendered, and
 * there is nothing to prerender them from.
 */
export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [posts, setPosts] = useState<PostSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [view, setView] = useState<'list' | 'editor' | 'categories'>('list');
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Validate any stored token before showing the console.
  useEffect(() => {
    const stored = auth.user();
    if (!stored) {
      setChecking(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => auth.clear())
      .finally(() => setChecking(false));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [postList, categoryList] = await Promise.all([
        api.listPosts({ includeDrafts: true }),
        api.listCategories(),
      ]);
      setPosts(postList);
      setCategories(categoryList);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Load failed' });
      if (err instanceof Error && err.message.includes('Session expired')) setUser(null);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return posts.filter((post) => {
      if (categoryFilter && post.category !== categoryFilter) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) || post.slug.toLowerCase().includes(needle)
      );
    });
  }, [posts, filter, categoryFilter]);

  async function publish() {
    setPublishing(true);
    setNotice(null);
    try {
      const result = await api.publish();
      setNotice({
        kind: result.triggered ? 'ok' : 'error',
        text: result.triggered
          ? 'Rebuild started — the site updates in about 3–5 minutes.'
          : `Rebuild not started: ${result.detail}`,
      });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Publish failed' });
    } finally {
      setPublishing(false);
    }
  }

  if (checking) return <div className="admin-shell">Checking session…</div>;

  if (!user) {
    return <Login onSignedIn={setUser} />;
  }

  return (
    <div className="admin-shell">
      <div className="admin-bar">
        <h1>Content admin</h1>
        <span className="who">
          {user.username} · {posts.length} posts · {categories.length} categories
        </span>
        <button className="btn" onClick={() => setView('categories')}>
          Categories
        </button>
        <button
          className="btn"
          onClick={() => {
            setEditing(null);
            setView('editor');
          }}
        >
          New post
        </button>
        <button className="btn btn-primary" onClick={publish} disabled={publishing}>
          {publishing ? 'Publishing…' : 'Publish site'}
        </button>
        <button
          className="btn"
          onClick={() => {
            auth.clear();
            setUser(null);
          }}
        >
          Sign out
        </button>
      </div>

      {notice && <div className={`alert alert-${notice.kind}`}>{notice.text}</div>}

      {view === 'categories' ? (
        <CategoryManager
          categories={categories}
          onChanged={refresh}
          onClose={() => setView('list')}
        />
      ) : (
        <div className="admin-grid">
          <div className="admin-card">
            <div className="field">
              <label htmlFor="q">Find a post</label>
              <input
                id="q"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Title or slug…"
              />
            </div>
            <div className="field">
              <label htmlFor="cat-filter">Category</label>
              <select
                id="cat-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="post-rows">
              {visible.length === 0 && <div className="hint">No posts match.</div>}
              {visible.map((post) => (
                <button
                  key={post.slug}
                  className={`post-row${editing === post.slug ? ' active' : ''}`}
                  onClick={() => {
                    setEditing(post.slug);
                    setView('editor');
                  }}
                >
                  <div className="t">
                    {post.title}
                    {/* Migrated index entries predate the status field; absent
                        means published, only an explicit non-published value
                        is a draft. */}
                    {post.status && post.status !== 'published' && (
                      <span className="badge badge-draft">draft</span>
                    )}
                  </div>
                  <div className="m">
                    /{post.category}/{post.slug} · {post.date?.slice(0, 10)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {view === 'editor' ? (
            <PostEditor
              slug={editing}
              categories={categories}
              onSaved={() => refresh()}
              onDeleted={() => {
                setEditing(null);
                setView('list');
                refresh();
              }}
              onCancel={() => {
                setEditing(null);
                setView('list');
              }}
            />
          ) : (
            <div className="admin-card">
              <p className="hint" style={{ margin: 0 }}>
                Select a post to edit, or create a new one. Changes are saved to S3 immediately but
                only appear on the live site after <strong>Publish site</strong> rebuilds it.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
