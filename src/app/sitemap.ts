import type { MetadataRoute } from 'next';
import { SITE_URL, allPosts, allCategories, totalPages } from '@/lib/content';
import { keptPageUrls } from '@/lib/pages';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = allPosts();
  const newest = posts[0]?.modified ?? new Date().toISOString();

  // Archive pages 2..N. Low priority — every post is already one click from a
  // category archive, so these mainly help crawlers walk back through history.
  const archives = Array.from({ length: Math.max(0, totalPages() - 1) }, (_, i) => ({
    url: `${SITE_URL}/page/${i + 2}`,
    changeFrequency: 'weekly' as const,
    priority: 0.3,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(newest), changeFrequency: 'daily', priority: 1 },
    ...archives,
    ...allCategories().map((category) => ({
      url: `${SITE_URL}${category.url}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}${post.url}`,
      lastModified: new Date(post.modified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...keptPageUrls().map((page) => ({
      url: `${SITE_URL}/${page}`,
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
  ];
}
