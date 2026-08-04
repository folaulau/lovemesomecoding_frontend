'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Search from './Search';

type NavItem = { slug: string; name: string; count: number; url: string };
type NavGroup = { label: string; items: NavItem[] };
type NavLink = { label: string; href: string };

export default function Navbar({
  groups,
  links = [],
}: {
  groups: NavGroup[];
  links?: NavLink[];
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);

  // Close dropdowns on outside click and on Escape.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className="topbar" ref={barRef}>
      <Link href="/" className="topbar-logo">
        lovemesomecoding<span className="dot">.</span>
      </Link>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        ☰
      </button>

      <nav className={`nav-groups${mobileOpen ? ' open' : ''}`}>
        {/* Standalone links lead, matching the original site's nav order. */}
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-link"
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}

        {groups.map((group) => (
          <div
            key={group.label}
            className="nav-group"
            data-open={openGroup === group.label}
            onMouseEnter={() => window.innerWidth > 992 && setOpenGroup(group.label)}
            onMouseLeave={() => window.innerWidth > 992 && setOpenGroup(null)}
          >
            <button
              aria-expanded={openGroup === group.label}
              onClick={() => setOpenGroup((v) => (v === group.label ? null : group.label))}
            >
              {group.label} ▾
            </button>
            {openGroup === group.label && (
              <div className="nav-dropdown">
                {group.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={item.url}
                    onClick={() => {
                      setOpenGroup(null);
                      setMobileOpen(false);
                    }}
                  >
                    <span>{item.name}</span>
                    <span className="count">{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="nav-right">
        <Search />
        <ThemeToggle />
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle dark mode" suppressHydrationWarning>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
