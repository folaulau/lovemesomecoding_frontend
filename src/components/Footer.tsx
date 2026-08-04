import Link from 'next/link';
import { footerPages } from '@/lib/nav';

const LABELS: Record<string, string> = {
  'about-me': 'About Me',
  contact: 'Contact',
  'privacy-policy': 'Privacy Policy',
  'terms-and-conditions': 'Terms & Conditions',
  'cookie-policy': 'Cookie Policy',
};

export default function Footer() {
  const pages = footerPages();
  return (
    <footer className="site-footer">
      <nav>
        {pages.map((page) => (
          <Link key={page} href={`/${page}`}>
            {LABELS[page] ?? page}
          </Link>
        ))}
        {/* Plain anchor, not Link: rss.xml is a static file emitted by
            postbuild.mjs, not a Next route. Link would prefetch
            /rss.xml.txt?_rsc=… and 404 on every page load. */}
        <a href="/rss.xml">RSS</a>
      </nav>
      <div className="copy">
        © {new Date().getFullYear()} lovemesomecoding.com — practical tutorials for working developers.
      </div>
    </footer>
  );
}
