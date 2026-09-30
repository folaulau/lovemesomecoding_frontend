'use client';

import { useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import RichTextEditor from './RichTextEditor';

/**
 * The visual editor works on a fixed schema, so markup outside it — the
 * `<div class="boldgrid-section">` wrappers WordPress left on migrated posts,
 * inline styles, arbitrary classes — cannot round-trip. Text, headings, lists,
 * tables, links and code blocks all survive; the layout scaffolding does not.
 *
 * Detecting it lets us warn instead of quietly rewriting a 40 KB tutorial.
 */
function hasUnrepresentableMarkup(html: string): boolean {
  const withoutCode = html.replace(/<pre[\s\S]*?<\/pre>/gi, '');
  return /<(div|section|span|figure|iframe)\b/i.test(withoutCode) || /\sstyle="/i.test(withoutCode);
}

/**
 * Visual / HTML / Preview editing of a content body, shared by posts and pages.
 * `savedHtml` is the body as last loaded or saved — the legacy-markup warning is
 * judged on that, not on the in-progress edit.
 */
export default function BodyEditor({
  value,
  savedHtml,
  noun,
  onChange,
  onStatus,
}: {
  value: string;
  savedHtml: string;
  noun: 'post' | 'page';
  onChange: (html: string) => void;
  onStatus: (status: { kind: 'error' | 'ok'; text: string }) => void;
}) {
  const [tab, setTab] = useState<'visual' | 'html' | 'preview'>('visual');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const legacyMarkup = useMemo(() => hasUnrepresentableMarkup(savedHtml), [savedHtml]);

  function insert(before: string, after = '') {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value: current } = el;
    const selected = current.slice(start, end);
    onChange(current.slice(0, start) + before + selected + after + current.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  }

  async function uploadImage(file: File) {
    try {
      const result = await api.uploadImage(file);
      insert(`<img src="${result.publicUrl}" alt="" />`);
      onStatus({ kind: 'ok', text: `Uploaded ${file.name}` });
    } catch (err) {
      onStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  return (
    <>
      <div className="editor-tabs">
        <button className={tab === 'visual' ? 'active' : ''} onClick={() => setTab('visual')}>
          Visual
        </button>
        <button className={tab === 'html' ? 'active' : ''} onClick={() => setTab('html')}>
          HTML
        </button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          Preview
        </button>
      </div>

      {tab === 'visual' && legacyMarkup && (
        <div className="alert alert-error" role="status">
          <strong>Heads up:</strong> this {noun} carries layout markup from WordPress that the visual
          editor cannot represent. Your text, headings, lists, tables, links and code blocks are all
          preserved, but wrapper elements and inline styles will be dropped <em>once you edit here</em>.
          Nothing changes until you type. Use the <strong>HTML</strong> tab to keep the original markup.
        </div>
      )}

      {tab === 'visual' ? (
        <RichTextEditor
          value={value}
          onChange={onChange}
          onUploadImage={async (file) => {
            const result = await api.uploadImage(file);
            return result.publicUrl;
          }}
        />
      ) : tab === 'html' ? (
        <>
          <div className="toolbar">
            <button onClick={() => insert('<h2>', '</h2>')}>H2</button>
            <button onClick={() => insert('<h3>', '</h3>')}>H3</button>
            <button onClick={() => insert('<p>', '</p>')}>Paragraph</button>
            <button onClick={() => insert('<strong>', '</strong>')}>Bold</button>
            <button onClick={() => insert('<ul>\n<li>', '</li>\n</ul>')}>List</button>
            <button
              onClick={() =>
                insert('<pre data-enlighter-language="java"><code>', '</code></pre>')
              }
            >
              Code block
            </button>
            <button onClick={() => insert('<code>', '</code>')}>Inline code</button>
            <label className="btn" style={{ padding: '4px 9px', fontSize: '0.78rem', fontWeight: 400 }}>
              Upload image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="field">
            <textarea
              ref={textarea}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
            />
            <div className="hint">
              Code blocks get their language from <code>data-enlighter-language</code> and are
              highlighted at build time.
            </div>
          </div>
        </>
      ) : (
        <div className="preview prose" dangerouslySetInnerHTML={{ __html: value }} />
      )}
    </>
  );
}
