import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'Admin',
  // Belt and braces alongside the Disallow in robots.txt — the admin must never
  // reach an index.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
