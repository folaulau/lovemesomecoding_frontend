'use client';

/** Client for the admin API. Browser-only — never imported by a server component. */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.lovemesomecoding.com').replace(/\/$/, '');
const TOKEN_KEY = 'lmsc.admin.token';
const USER_KEY = 'lmsc.admin.user';

export type AdminUser = { username: string; role: string };

export type PostSummaryDto = {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  modified: string;
  excerpt: string;
  url: string;
  readingMinutes: number;
  /** Absent on entries written by the migration — treat that as published. */
  status?: string;
};

export type PostDto = PostSummaryDto & {
  contentHtml: string;
  toc: { id: string; text: string; level: number }[];
  wordCount: number;
};

export type CategoryDto = {
  slug: string;
  name: string;
  description: string;
  count: number;
  url: string;
};

export type PageSummaryDto = {
  slug: string;
  title: string;
  url: string;
  modified: string;
};

export type PageDto = PageSummaryDto & {
  contentHtml: string;
  toc: { id: string; text: string; level: number }[];
  date: string;
  updatedBy?: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const auth = {
  token: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  user: (): AdminUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  },
  save: (token: string, user: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.token();
  const response = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401) {
    // Token expired or revoked — force a fresh login rather than showing errors.
    auth.clear();
    throw new ApiError(401, 'Session expired — please sign in again.');
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      // FastAPI validation errors come back as a list of issues.
      if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((d: { loc?: string[]; msg: string }) => `${d.loc?.slice(1).join('.') ?? ''} ${d.msg}`.trim())
          .join('; ');
      } else if (typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(response.status, detail);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  login: async (username: string, password: string) => {
    const result = await request<{ token: string; username: string; role: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    );
    auth.save(result.token, { username: result.username, role: result.role });
    return result;
  },

  me: () => request<AdminUser>('/auth/me'),

  listPosts: (opts: { category?: string; includeDrafts?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (opts.category) params.set('category', opts.category);
    if (opts.includeDrafts) params.set('includeDrafts', 'true');
    const query = params.toString();
    return request<PostSummaryDto[]>(`/posts${query ? `?${query}` : ''}`);
  },

  getPost: (slug: string) => request<PostDto>(`/posts/${slug}`),

  savePost: (post: {
    slug: string;
    title: string;
    category: string;
    contentHtml: string;
    tags: string[];
    status: string;
  }) => request<PostDto>(`/posts/${post.slug}`, { method: 'PUT', body: JSON.stringify(post) }),

  deletePost: (slug: string) => request<{ deleted: string }>(`/posts/${slug}`, { method: 'DELETE' }),

  listCategories: () => request<CategoryDto[]>('/categories'),

  saveCategory: (category: { slug: string; name: string; description: string }) =>
    request<CategoryDto>(`/categories/${category.slug}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    }),

  deleteCategory: (slug: string) =>
    request<{ deleted: string }>(`/categories/${slug}`, { method: 'DELETE' }),

  listPages: () => request<PageSummaryDto[]>('/pages'),

  getPage: (slug: string) => request<PageDto>(`/pages/${slug}`),

  /** Update only — the set of pages is fixed by the frontend, so there is no create or delete. */
  savePage: (slug: string, page: { title: string; contentHtml: string }) =>
    request<PageDto>(`/pages/${slug}`, { method: 'PUT', body: JSON.stringify(page) }),

  publish: () => request<{ triggered: boolean; detail: string }>('/publish', { method: 'POST' }),

  /** Two steps: ask the API for a presigned URL, then PUT the bytes straight to S3. */
  uploadImage: async (file: File) => {
    const presigned = await request<{
      uploadUrl: string;
      key: string;
      publicUrl: string;
      contentType: string;
    }>('/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });

    const upload = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        // Must match the presigned params exactly or S3 rejects the signature.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    if (!upload.ok) throw new ApiError(upload.status, 'Upload to S3 failed');

    return presigned;
  },
};
