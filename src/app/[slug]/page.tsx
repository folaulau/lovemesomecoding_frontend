import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { SITE_URL } from '@/lib/content';
import { displayName } from '@/lib/nav';
import { oneSegmentRoutes, resolveOneSegment } from '@/lib/routes';

export const dynamicParams = false;

export async function generateStaticParams() {
  return oneSegmentRoutes().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const resolved = resolveOneSegment(params.slug);
  if (!resolved) return {};

  if (resolved.kind === 'page') {
    return {
      title: resolved.page.title,
      alternates: { canonical: `/${params.slug}` },
      openGraph: { title: resolved.page.title, url: `${SITE_URL}/${params.slug}`, type: 'article' },
    };
  }

  const name = displayName(resolved.category);
  const description =
    resolved.category.description ||
    `${resolved.category.count} practical ${name} tutorials, from fundamentals to advanced topics.`;
  return {
    title: `${name} Tutorials`,
    description,
    alternates: { canonical: `/${params.slug}` },
    openGraph: { title: `${name} Tutorials`, description, url: `${SITE_URL}/${params.slug}` },
  };
}

export default function OneSegmentRoute({ params }: { params: { slug: string } }) {
  const resolved = resolveOneSegment(params.slug);
  if (!resolved) notFound();

  if (resolved.kind === 'page') {
    const { page } = resolved;
    return (
      <div className="layout">
        <div className="content">
          <div className="article-head">
            <h1>{page.title}</h1>
          </div>
          <article className="prose" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
        </div>
      </div>
    );
  }

  const { category, posts } = resolved;
  const name = displayName(category);

  return (
    <div className="layout">
      <Sidebar heading={name} posts={posts} />
      <div className="content">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          {name}
        </div>
        <div className="article-head">
          <h1>{name} Tutorials</h1>
          <div className="meta">
            <span>
              {category.count} tutorial{category.count === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {category.description && <p className="sub">{category.description}</p>}

        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.url}>
              <Link href={post.url}>{post.title}</Link>
              <div className="excerpt">{post.excerpt}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
