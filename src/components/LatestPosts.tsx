import Link from 'next/link';
import type { PostsPage } from '@/lib/content';
import { displayNameForSlug } from '@/lib/nav';

/**
 * Latest-posts list with pagination. Shared by the homepage (page 1) and the
 * /page/[n] archives so both render identically.
 */
export default function LatestPosts({ page }: { page: PostsPage }) {
  const { posts, current, total, newerUrl, olderUrl } = page;

  return (
    <section aria-labelledby="latest-heading">
      <h2 id="latest-heading">Latest tutorials</h2>
      <p className="sub">
        {current === 1 ? 'Freshly published' : `Page ${current} of ${total}`}
      </p>

      <ul className="recent">
        {posts.map((post) => (
          <li key={post.url}>
            <Link href={post.url}>{post.title}</Link>
            <div className="r-meta">
              <Link href={`/${post.category}`}>{displayNameForSlug(post.category)}</Link>
              {' · '}
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
              {' · '}
              {post.readingMinutes} min read
            </div>
            {post.excerpt && <div className="r-excerpt">{post.excerpt}</div>}
          </li>
        ))}
      </ul>

      <nav className="page-nav" aria-label="Latest tutorials pagination">
        {newerUrl ? (
          <Link href={newerUrl} className="btn-page" rel="prev">
            ‹ Newer
          </Link>
        ) : (
          <span className="btn-page disabled">‹ Newer</span>
        )}

        <span className="page-count">
          Page {current} of {total}
        </span>

        {olderUrl ? (
          <Link href={olderUrl} className="btn-page" rel="next">
            Older ›
          </Link>
        ) : (
          <span className="btn-page disabled">Older ›</span>
        )}
      </nav>
    </section>
  );
}
