
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { compressImage } from '../utils/imageCompression';
import MathPalette from './MathPalette';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload: (file: File) => Promise<string | null>;
  height?: string;
  simple?: boolean; // Jika true, toolbar lebih sederhana (untuk opsi jawaban)
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  onImageUpload,
  height = "h-48",
  simple = false
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Keep a ref to the latest onChange to avoid stale closures in memoized callbacks
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // Sync value prop to innerHTML only if different (to prevent cursor jumping)
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      if (value === '' && contentRef.current.innerHTML === '<br>') return;
      contentRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChangeRef.current(contentRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  // ─── Save & Restore Selection ──────────────────────────────────
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      // Only save if the range is inside our editor
      const range = sel.getRangeAt(0);
      if (contentRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreAndFocus = useCallback(() => {
    // Simpan range ke variabel lokal SEBELUM focus() dipanggil,
    // karena focus() bisa trigger onFocus → saveSelection() yang menimpa savedSelectionRef
    const savedRange = savedSelectionRef.current;
    contentRef.current?.focus();
    if (savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
    }
  }, []);

  // ─── Math Symbol / HTML Insertion ─────────────────────────────
  const insertMathText = useCallback((text: string) => {
    restoreAndFocus();
    document.execCommand('insertText', false, text);
    handleInput();
    // Update savedSelection setelah insert agar simbol berikutnya masuk di posisi yang benar
    requestAnimationFrame(saveSelection);
  }, [restoreAndFocus, saveSelection]);

  const insertMathHtml = useCallback((html: string) => {
    restoreAndFocus();

    // ── Gunakan Range API (bukan execCommand insertHTML) agar tidak ada
    // wrapper <div>/<p> yang otomatis ditambahkan browser, yang menyebabkan
    // rumus tampil sebagai blok baru (bukan inline di samping teks). ──────
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      // Parse HTML via <template> — hasilnya adalah fragment murni tanpa wrapper
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      const fragment = tpl.content.cloneNode(true) as DocumentFragment;

      // Simpan referensi node terakhir untuk posisi kursor setelah insert
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);

      // Pindahkan kursor tepat setelah konten yang baru disisipkan
      if (lastNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
      }
    } else {
      // Fallback jika tidak ada selection aktif
      document.execCommand('insertHTML', false, html);
    }

    handleInput();
  }, [restoreAndFocus]);

  const handleSuperscript = useCallback(() => {
    restoreAndFocus();
    execCmd('superscript');
    requestAnimationFrame(saveSelection);
  }, [restoreAndFocus, saveSelection]);

  const handleSubscript = useCallback(() => {
    restoreAndFocus();
    execCmd('subscript');
    requestAnimationFrame(saveSelection);
  }, [restoreAndFocus, saveSelection]);

  // ─── Image Upload ──────────────────────────────────────────────
  const handleImageClick = () => {
    saveSelection();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const processedFile = await compressImage(file);
        const url = await onImageUpload(processedFile);
        if (url) {
          restoreAndFocus();
          execCmd('insertImage', url);
        }
      } catch (err: any) {
        console.error("Failed to insert image", err);
        if (err.message && err.message.includes("Entity Too Large")) {
          alert("Ukuran gambar terlalu besar meskipun sudah dikompres. Mohon gunakan gambar di bawah 5MB.");
        } else {
          alert("Gagal mengupload gambar. Pastikan format didukung (JPG/PNG).");
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  // Helper: tombol toolbar bergaya Word
  const ToolbarButton = ({ cmd, arg, icon, title }: { cmd: string; arg?: string; icon: React.ReactNode; title: string }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); execCmd(cmd, arg); }}
      className="flex items-center justify-center w-7 h-7 text-gray-700 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100 rounded transition-colors"
      title={title}
    >
      {icon}
    </button>
  );

  // Pemisah grup toolbar bergaya Word
  const Sep = () => <div className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0" />;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">

      {/* ── TOOLBAR BERGAYA MICROSOFT WORD ─────────────────────────────── */}
      <div className="bg-[#f3f3f3] border-b border-gray-300">

        {/* Baris 1: Format Teks — mirip ribbon Word */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200">

          {/* Grup: Font Family + Font Size */}
          <div className="flex items-center gap-1 mr-1">
            <select
              onMouseDown={e => e.stopPropagation()}
              onChange={e => { restoreAndFocus(); execCmd('fontName', e.target.value); }}
              className="h-7 text-[11px] border border-gray-200 rounded bg-white text-gray-700 px-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
              title="Jenis Huruf"
              defaultValue=""
            >
              <option value="" disabled>Huruf</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Courier New">Courier New</option>
              <option value="Tahoma">Tahoma</option>
            </select>
            <select
              onMouseDown={e => e.stopPropagation()}
              onChange={e => { restoreAndFocus(); execCmd('fontSize', e.target.value); }}
              className="h-7 w-16 text-[11px] border border-gray-200 rounded bg-white text-gray-700 px-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
              title="Ukuran Huruf (1=8pt, 2=10pt, 3=12pt, 4=14pt, 5=18pt, 6=24pt, 7=36pt)"
              defaultValue=""
            >
              <option value="" disabled>Ukuran</option>
              <option value="1">8pt</option>
              <option value="2">10pt</option>
              <option value="3">12pt</option>
              <option value="4">14pt</option>
              <option value="5">18pt</option>
              <option value="6">24pt</option>
              <option value="7">36pt</option>
            </select>
          </div>

          <Sep />

          {/* Grup: Font style */}
          <div className="flex items-center gap-0.5 mr-1">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block mr-1">Format</span>
            <ToolbarButton title="Tebal (Ctrl+B)" cmd="bold"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>} />
            <ToolbarButton title="Miring (Ctrl+I)" cmd="italic"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>} />
            <ToolbarButton title="Garis Bawah (Ctrl+U)" cmd="underline"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>} />
            <ToolbarButton title="Coret" cmd="strikethrough"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><path d="M17.5 6.5C17.5 4.6 15.5 3 12 3s-5.5 1.6-5.5 3.5c0 4 11 4 11 7.5 0 2-1.5 4-5.5 4s-5.5-2-5.5-4"/></svg>} />
          </div>

          <Sep />

          {/* Grup: Warna teks */}
          <div className="flex items-center gap-0.5 mr-1">
            <div className="relative flex items-center justify-center w-7 h-7 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="Warna Teks">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>
              <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Warna Teks" onChange={(e) => execCmd('foreColor', e.target.value)} />
            </div>
            <div className="relative flex items-center justify-center w-7 h-7 text-gray-700 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors cursor-pointer" title="Sorot / Highlight">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
              <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Warna Sorot" onChange={(e) => execCmd('hiliteColor', e.target.value)} />
            </div>
          </div>

          <Sep />

          {/* Grup: Pangkat & Indeks — penting untuk Matematika */}
          <div className="flex items-center gap-0.5 mr-1">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block mr-1">Pangkat</span>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSuperscript(); }}
              className="flex items-center justify-center w-7 h-7 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-[11px] font-bold"
              title="Pangkat / Superscript — pilih teks lalu klik">
              x<sup className="text-[8px]">2</sup>
            </button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSubscript(); }}
              className="flex items-center justify-center w-7 h-7 text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors text-[11px] font-bold"
              title="Indeks / Subscript — pilih teks lalu klik">
              x<sub className="text-[8px]">n</sub>
            </button>
          </div>

          <Sep />

          {/* Grup: Simbol & Rumus Matematika */}
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide hidden sm:block mr-1">Rumus</span>
            <MathPalette
              onInsert={insertMathText}
              onInsertHtml={insertMathHtml}
              onSuperscript={handleSuperscript}
              onSubscript={handleSubscript}
            />
          </div>

          {/* Grup: Gambar */}
          <Sep />
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={handleImageClick} disabled={isUploading}
              className="flex items-center justify-center w-7 h-7 text-gray-700 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
              title="Sisipkan Gambar (JPG/PNG, auto-compress)">
              {isUploading
                ? <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
        </div>

        {/* Baris 2: Paragraf & Alignment (hanya muncul untuk editor penuh, bukan simple) */}
        {!simple && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1">
            {/* Grup: Perataan teks */}
            <div className="flex items-center gap-0.5 mr-1">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block mr-1">Rata</span>
              <ToolbarButton title="Rata Kiri" cmd="justifyLeft"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>} />
              <ToolbarButton title="Rata Tengah" cmd="justifyCenter"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>} />
              <ToolbarButton title="Rata Kanan" cmd="justifyRight"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>} />
              <ToolbarButton title="Rata Kanan-Kiri" cmd="justifyFull"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>} />
            </div>

            <Sep />

            {/* Grup: Daftar */}
            <div className="flex items-center gap-0.5 mr-1">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:block mr-1">Daftar</span>
              <ToolbarButton title="Daftar Bernomor" cmd="insertOrderedList"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>} />
              <ToolbarButton title="Daftar Butir" cmd="insertUnorderedList"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
            </div>

            <Sep />

            {/* Grup: Indentasi */}
            <div className="flex items-center gap-0.5 mr-1">
              <ToolbarButton title="Tambah Indentasi" cmd="indent"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>} />
              <ToolbarButton title="Kurangi Indentasi" cmd="outdent"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>} />
            </div>

            <Sep />

            {/* Undo & Redo */}
            <div className="flex items-center gap-0.5">
              <ToolbarButton title="Urungkan (Ctrl+Z)" cmd="undo"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>} />
              <ToolbarButton title="Ulangi (Ctrl+Y)" cmd="redo"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>} />
            </div>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
        className={`w-full p-3 overflow-y-auto outline-none prose max-w-none text-sm text-gray-800 ${height}`}
        style={{ minHeight: height === 'h-auto' ? '80px' : undefined }}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 0.5rem 0;
          border: 1px solid #e5e7eb;
        }
        .prose ul { list-style-type: disc; padding-left: 1.5rem; }
        .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
        .prose sup, .prose sub { font-size: 0.75em; line-height: 0; position: relative; vertical-align: baseline; }
        .prose sup { top: -0.5em; }
        .prose sub { bottom: -0.25em; }

        /* ── Math formula atoms (contenteditable=false) ── */
        /* Kursor bisa diposisikan sebelum/sesudah formula dengan keyboard arrows */
        /* pointer-events: none → klik diteruskan ke editor parent sehingga
           browser tidak memindahkan fokus ke elemen lain (mis. editor opsi jawaban) */
        .prose [contenteditable="false"] {
          user-select: none;
          -webkit-user-select: none;
          cursor: text;
          display: inline;
          pointer-events: none;
        }
        /* Zero-width space setelah formula tidak tampak, tapi jadi anchor kursor */
        .prose [contenteditable="false"] + :empty::before { display: none; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
