'use client';

import { useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { createLowlight } from 'lowlight';

import java from 'highlight.js/lib/languages/java';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import kotlin from 'highlight.js/lib/languages/kotlin';
import groovy from 'highlight.js/lib/languages/groovy';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import powershell from 'highlight.js/lib/languages/powershell';
import markdown from 'highlight.js/lib/languages/markdown';

const lowlight = createLowlight();
lowlight.register({
  java, python, bash, sql, javascript, css, xml, json, yaml,
  kotlin, groovy, dockerfile, powershell, markdown,
});

/**
 * Languages offered in the code-block picker. These are the ids the site's
 * build-time Prism highlighter understands; the backend maps anything else to
 * plaintext, so keeping the list aligned avoids silently losing highlighting.
 */
export const CODE_LANGUAGES = [
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'bash', label: 'Shell' },
  { id: 'sql', label: 'SQL' },
  { id: 'xml', label: 'HTML / XML' },
  { id: 'css', label: 'CSS' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'groovy', label: 'Groovy' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'powershell', label: 'PowerShell' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'plaintext', label: 'Plain text' },
];

export default function RichTextEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  // Guards the load path: setContent() fires onUpdate, and propagating that
  // would overwrite the stored HTML with TipTap's normalised version even when
  // the author never typed anything.
  const loading = useRef(false);
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false, // this is a static export; there is no SSR pass
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
        // Emits <pre><code class="language-X">, which is exactly what the
        // backend normaliser reads to tag the block.
        languageClassPrefix: 'language-',
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: { attributes: { class: 'tiptap prose' } },
    onUpdate: ({ editor: e }) => {
      if (loading.current) return;
      const html = e.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Pull external edits (HTML tab, loading a different post) into the editor
  // without echoing them straight back out.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    loading.current = true;
    editor.commands.setContent(value, false);
    lastEmitted.current = value;
    loading.current = false;
  }, [value, editor]);

  const addImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: '' }).run();
    },
    [editor, onUploadImage],
  );

  if (!editor) return <div className="tiptap-shell">Loading editor…</div>;

  return (
    <div className="tiptap-shell">
      <Toolbar editor={editor} onUploadImage={addImage} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onUploadImage,
}: {
  editor: Editor;
  onUploadImage: (file: File) => Promise<void>;
}) {
  const btn = (active: boolean) => `tt-btn${active ? ' active' : ''}`;
  const currentLanguage = editor.getAttributes('codeBlock').language ?? 'plaintext';

  return (
    <div className="tt-toolbar">
      <button className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
      <button className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
      <button className={btn(editor.isActive('code'))}
        onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">{'</>'}</button>

      <span className="tt-sep" />

      <button className={btn(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button className={btn(editor.isActive('heading', { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <button className={btn(editor.isActive('paragraph'))}
        onClick={() => editor.chain().focus().setParagraph().run()}>¶</button>

      <span className="tt-sep" />

      <button className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
      <button className={btn(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</button>
      <button className={btn(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">❝</button>

      <span className="tt-sep" />

      <button className={btn(editor.isActive('codeBlock'))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">Code block</button>
      {editor.isActive('codeBlock') && (
        <select
          className="tt-select"
          value={currentLanguage}
          onChange={(e) =>
            editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run()
          }
        >
          {CODE_LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      )}

      <span className="tt-sep" />

      <button className={btn(editor.isActive('link'))} title="Link"
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}>Link</button>

      <label className="tt-btn" title="Upload an image">
        Image
        <input type="file" accept="image/*" hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadImage(file);
            e.target.value = '';
          }} />
      </label>

      <button className="tt-btn" title="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }>Table</button>

      <span className="tt-sep" />

      <button className="tt-btn" onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()} title="Undo">↶</button>
      <button className="tt-btn" onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()} title="Redo">↷</button>
    </div>
  );
}
