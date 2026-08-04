import Link from 'next/link';
import type { PostSummary } from '@/lib/content';

/**
 * Left tutorial rail. Lists every post in the current category oldest-first so it
 * reads as a course track, matching the prev/next pager order.
 */
export default function Sidebar({
  heading,
  posts,
  activeSlug,
}: {
  heading: string;
  posts: PostSummary[];
  activeSlug?: string;
}) {
  if (posts.length === 0) return null;
  const track = [...posts].reverse();

  return (
    <aside className="sidebar">
      <h3>{heading}</h3>
      <nav>
        {track.map((post) => (
          <Link
            key={post.slug}
            href={post.url}
            className={post.slug === activeSlug ? 'active' : undefined}
            aria-current={post.slug === activeSlug ? 'page' : undefined}
          >
            {post.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
