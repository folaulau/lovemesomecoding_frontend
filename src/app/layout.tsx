import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CodeCopy from '@/components/CodeCopy';
import { navTree } from '@/lib/nav';
import { SITE_URL } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Love Me Some Coding — practical programming tutorials',
    template: '%s | Love Me Some Coding',
  },
  description:
    'Clear, practical tutorials on Java, Python, SQL, AWS, Spring Boot, React and more — written for developers who want working answers, not quick hacks.',
  alternates: { canonical: '/', types: { 'application/rss+xml': '/rss.xml' } },
  openGraph: {
    type: 'website',
    siteName: 'Love Me Some Coding',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

/** Applied before first paint so the theme never flashes. */
const THEME_BOOTSTRAP = `
(function(){try{
  var t=localStorage.getItem('theme');
  if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <link rel="alternate" type="application/rss+xml" title="Love Me Some Coding" href="/rss.xml" />
      </head>
      <body>
        <Navbar groups={navTree()} />
        {children}
        <Footer />
        <CodeCopy />
      </body>
    </html>
  );
}
