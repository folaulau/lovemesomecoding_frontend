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
        <Link href="/rss.xml">RSS</Link>
      </nav>
      <div className="copy">
        © {new Date().getFullYear()} lovemesomecoding.com — practical tutorials for working developers.
      </div>
    </footer>
  );
}
