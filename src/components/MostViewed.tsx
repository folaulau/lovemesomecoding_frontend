import Link from 'next/link';
import type { PostSummary } from '@/lib/content';
import { displayNameForSlug } from '@/lib/nav';

/**
 * Homepage "Most viewed" cards — every post tagged `most-view`. The homepage
 * omits the section entirely when nothing carries the tag.
 */
export default function MostViewed({ posts }: { posts: PostSummary[] }) {
  return (
    <section aria-labelledby="most-viewed-heading">
      <h2 id="most-viewed-heading">Most viewed</h2>
      <p className="sub">The tutorials readers come back to most</p>

      <div className="mv-grid">
        {posts.map((post) => (
          <Link key={post.url} href={post.url} className="mv-card">
            <div className="g">{displayNameForSlug(post.category)}</div>
            <div className="n">{post.title}</div>
            {post.excerpt && <div className="e">{post.excerpt}</div>}
            <div className="c">{post.readingMinutes} min read</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
