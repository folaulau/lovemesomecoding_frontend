import Link from 'next/link';
import { allCategories } from '@/lib/content';
import { displayName } from '@/lib/nav';

export default function NotFound() {
  const popular = allCategories().slice(0, 12);
  return (
    <div className="home-wrap" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', margin: '30px 0 8px' }}>404</h1>
      <p className="sub">That page moved or never existed. Try a topic below, or search above.</p>
      <div className="cat-grid" style={{ marginTop: '28px', textAlign: 'left' }}>
        {popular.map((category) => (
          <Link key={category.slug} href={category.url} className="cat-card">
            <div className="n">{displayName(category)}</div>
            <div className="c">{category.count} tutorials</div>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: '32px' }}>
        <Link href="/">← Back to home</Link>
      </p>
    </div>
  );
}
