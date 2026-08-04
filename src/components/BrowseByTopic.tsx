import Link from 'next/link';
import { allCategories, allPosts } from '@/lib/content';
import { displayName, navTree } from '@/lib/nav';

/** Category grid. Shared by the homepage and the paginated archives. */
export default function BrowseByTopic() {
  const categories = allCategories();
  const groupOf = new Map<string, string>();
  for (const group of navTree()) {
    for (const item of group.items) groupOf.set(item.slug, group.label);
  }

  return (
    <section aria-labelledby="topics-heading">
      <h2 id="topics-heading">Browse by topic</h2>
      <p className="sub">
        {categories.length} topics · {allPosts().length} tutorials
      </p>
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
    </section>
  );
}
