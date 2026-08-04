import Link from 'next/link';
import { allPosts, allCategories } from '@/lib/content';
import { navTree, displayName } from '@/lib/nav';

export default function Home() {
  const posts = allPosts();
  const categories = allCategories();
  const groups = navTree();
  const recent = posts.slice(0, 12);

  const groupOf = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) groupOf.set(item.slug, group.label);
  }

  return (
    <>
      <section className="hero">
        <h1>
          Love Me Some Coding<span className="dot">.</span>
        </h1>
        <p>
          {posts.length} practical tutorials on Java, Python, SQL, AWS, Spring Boot and more —
          written for developers who want working answers, not quick hacks.
        </p>
        <Link href="/java" className="cta">
          Start Learning
        </Link>
      </section>

      <div className="home-wrap">
        <h2>Browse by topic</h2>
        <p className="sub">{categories.length} topics · {posts.length} tutorials</p>
        <div className="cat-grid">
          {categories.map((category) => (
            <Link key={category.slug} href={category.url} className="cat-card">
              <div className="g">{groupOf.get(category.slug) ?? 'More'}</div>
              <div className="n">{displayName(category)}</div>
              <div className="c">
                {category.count} tutorial{category.count === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>

        <h2 style={{ marginTop: '54px' }}>Latest tutorials</h2>
        <p className="sub">Freshly published</p>
        <ul className="recent">
          {recent.map((post) => (
            <li key={post.url}>
              <Link href={post.url}>{post.title}</Link>
              <div className="r-meta">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {post.readingMinutes} min read
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
