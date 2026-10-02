import Link from 'next/link';
import LatestPosts from '@/components/LatestPosts';
import BrowseByTopic from '@/components/BrowseByTopic';
import MostViewed from '@/components/MostViewed';
import { MOST_VIEWED_TAG, allPosts, postsPage, postsWithTag } from '@/lib/content';

export default function Home() {
  // The homepage is page 1 of the latest-posts archive; /page/2 continues it.
  const page = postsPage(1);
  const mostViewed = postsWithTag(MOST_VIEWED_TAG);

  return (
    <>
      <section className="hero">
        <h1>
          Love Me Some Coding<span className="dot">.</span>
        </h1>
        <p>
          {allPosts().length} practical tutorials on Java, Python, SQL, AWS, Spring Boot and more —
          written for developers who want working answers, not quick hacks.
        </p>
        <Link href="/java" className="cta">
          Start Learning
        </Link>
      </section>

      <div className="home-wrap">
        {mostViewed.length > 0 && (
          <>
            <MostViewed posts={mostViewed} />
            <div className="section-gap" />
          </>
        )}
        <LatestPosts page={page} />
        <div className="section-gap" />
        <BrowseByTopic />
      </div>
    </>
  );
}
