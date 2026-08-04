'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/** Compact record emitted by transform.py: url, title, category, excerpt. */
type Hit = { u: string; t: string; c: string; x: string };

export default function Search() {
  const [index, setIndex] = useState<Hit[] | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 130 KB index, fetched lazily on first focus so it never blocks page load.
  async function ensureIndex() {
    if (index) return;
    try {
      const res = await fetch('/search-index.json');
      setIndex((await res.json()) as Hit[]);
    } catch {
      setIndex([]);
    }
  }

  useEffect(() => {
    if (!index || !query.trim()) {
      setHits([]);
      return;
    }
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored: { hit: Hit; score: number }[] = [];

    for (const hit of index) {
      const title = hit.t.toLowerCase();
      const haystack = `${title} ${hit.c} ${hit.x}`.toLowerCase();
      let score = 0;
      let matchedAll = true;

      for (const term of terms) {
        if (title.startsWith(term)) score += 10;
        else if (title.includes(term)) score += 6;
        else if (haystack.includes(term)) score += 2;
        else {
          matchedAll = false;
          break;
        }
      }
      if (matchedAll) scored.push({ hit, score });
    }

    scored.sort((a, b) => b.score - a.score || a.hit.t.length - b.hit.t.length);
    setHits(scored.slice(0, 25).map((s) => s.hit));
  }, [query, index]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="search" ref={boxRef}>
      <input
        type="search"
        placeholder="Search tutorials…"
        aria-label="Search tutorials"
        value={query}
        onFocus={() => {
          ensureIndex();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && query.trim() !== '' && (
        <div className="search-results">
          {hits.length === 0 ? (
            <div className="search-empty">No tutorials match “{query}”.</div>
          ) : (
            hits.map((hit) => (
              <Link key={hit.u} href={hit.u} onClick={() => setOpen(false)}>
                <div className="r-title">{hit.t}</div>
                <div className="r-meta">{hit.u}</div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
