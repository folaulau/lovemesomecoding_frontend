import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LatestPosts from '@/components/LatestPosts';
import BrowseByTopic from '@/components/BrowseByTopic';
import { SITE_URL, postsPage, totalPages } from '@/lib/content';

export const dynamicParams = false;

/**
 * Pages 2..N of the latest-posts archive. Page 1 is the homepage, so it is not
 * generated here — that would be a duplicate of / at a second URL.
 *
 * This route sits at /page/[n], a static first segment, so Next matches it
 * ahead of the catch-all /[slug]/[post] used for tutorials.
 */
export async function generateStaticParams() {
  const total = totalPages();
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export function generateMetadata({ params }: { params: { n: string } }): Metadata {
  const current = Number(params.n);
  return {
    title: `Latest tutorials — page ${current}`,
    description: `Page ${current} of tutorials on Java, Python, SQL, AWS, Spring Boot and more.`,
    alternates: { canonical: `/page/${current}` },
    openGraph: { title: `Latest tutorials — page ${current}`, url: `${SITE_URL}/page/${current}` },
  };
}

export default function ArchivePage({ params }: { params: { n: string } }) {
  const requested = Number(params.n);
  if (!Number.isInteger(requested) || requested < 2 || requested > totalPages()) notFound();

  const page = postsPage(requested);

  return (
    <div className="home-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>›</span>
        Page {page.current}
      </div>

      <LatestPosts page={page} />
      <div className="section-gap" />
      <BrowseByTopic />
    </div>
  );
}
