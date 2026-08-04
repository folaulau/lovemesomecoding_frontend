import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { SITE_URL, postsInCategory, siblings } from '@/lib/content';
import { displayNameForSlug } from '@/lib/nav';
import { resolveTwoSegments, twoSegmentRoutes } from '@/lib/routes';

export const dynamicParams = false;

export function generateStaticParams() {
  return twoSegmentRoutes();
}

export function generateMetadata({
  params,
}: {
  params: { slug: string; post: string };
}): Metadata {
  const resolved = resolveTwoSegments(params.slug, params.post);
  if (!resolved) return {};

  const url = `${SITE_URL}/${params.slug}/${params.post}`;

  if (resolved.kind === 'page') {
    return {
      title: resolved.page.title,
      alternates: { canonical: `/${params.slug}/${params.post}` },
      openGraph: { title: resolved.page.title, url, type: 'article' },
    };
  }

  const { post } = resolved;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: post.url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt },
  };
}

export default function TwoSegmentRoute({
  params,
}: {
  params: { slug: string; post: string };
}) {
  const resolved = resolveTwoSegments(params.slug, params.post);
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

  const { post } = resolved;
  const categoryName = displayNameForSlug(post.category);
  const { prev, next } = siblings(post);

  // Article schema so Google can render rich results for tutorials.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.modified,
    author: { '@type': 'Person', name: 'Folau Kaveinga' },
    publisher: { '@type': 'Organization', name: 'Love Me Some Coding' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${post.url}` },
    articleSection: categoryName,
    wordCount: post.wordCount,
  };

  return (
    <div className="layout">
      <Sidebar
        heading={categoryName}
        posts={postsInCategory(post.category)}
        activeSlug={post.slug}
      />
      <div className="content">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <Link href={`/${post.category}`}>{categoryName}</Link>
          <span>›</span>
          {post.title}
        </div>

        <div className="article-head">
          <h1>{post.title}</h1>
          <div className="meta">
            <span>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span>{post.readingMinutes} min read</span>
            {post.modified !== post.date && (
              <span>Updated {new Date(post.modified).toLocaleDateString('en-US')}</span>
            )}
          </div>
        </div>

        <article className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

        <nav className="pager">
          {prev ? <Link href={prev.url}>‹ {prev.title}</Link> : <span className="spacer" />}
          {next ? <Link href={next.url}>{next.title} ›</Link> : <span className="spacer" />}
        </nav>
      </div>
    </div>
  );
}
