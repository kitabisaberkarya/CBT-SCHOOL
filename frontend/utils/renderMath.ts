/**
 * renderMath.ts
 * KaTeX rendering utility untuk teks yang mengandung notasi LaTeX.
 * Support: $inline$ dan $$display$$
 * Digunakan di: ImportPreview, TestScreen, QuestionBank, dll.
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Opsi KaTeX render */
const KATEX_OPTS: katex.KatexOptions = {
  throwOnError: false,         // Jangan crash jika LaTeX invalid
  errorColor: '#E53E3E',       // Merah untuk error
  output: 'html',
  strict: false,
  trust: false,
  macros: {
    '\\angstrom': '\\text{Å}',
    '\\degree': '^{\\circ}',
  },
};

/**
 * Render LaTeX dalam teks HTML.
 * Mengganti pola $$...$$ (display) dan $...$ (inline) dengan HTML KaTeX.
 * Teks biasa di luar dollar sign tetap aman.
 *
 * @param text - teks yang mungkin mengandung $LaTeX$ atau $$LaTeX$$
 * @returns string HTML dengan KaTeX rendered
 */
export function renderMathInText(text: string): string {
  if (!text || (!text.includes('$') && !text.includes('\\('))) return text;

  // Step 1: render $$display$$
  let result = text.replace(/\$\$([^$]+)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { ...KATEX_OPTS, displayMode: true });
    } catch {
      return `<span class="katex-error">[${math}]</span>`;
    }
  });

  // Step 2: render $inline$ (hindari replace $$ yang sudah dirender)
  result = result.replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { ...KATEX_OPTS, displayMode: false });
    } catch {
      return `<span class="katex-error">[${math}]</span>`;
    }
  });

  // Step 3: render \(...\) inline
  result = result.replace(/\\\((.+?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { ...KATEX_OPTS, displayMode: false });
    } catch {
      return `<span class="katex-error">[${math}]</span>`;
    }
  });

  // Step 4: render \[...\] display
  result = result.replace(/\\\[(.+?)\\\]/gs, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { ...KATEX_OPTS, displayMode: true });
    } catch {
      return `<span class="katex-error">[${math}]</span>`;
    }
  });

  return result;
}

/**
 * Cek apakah string mengandung notasi math.
 */
export function containsMath(text: string): boolean {
  return /\$|\\\(|\\\[/.test(text);
}

/**
 * Sanitize HTML ringan sebelum dangerouslySetInnerHTML.
 * Izinkan: tag-tag aman dari mammoth + KaTeX output.
 * Blokir: script, iframe, event handlers.
 */
export function sanitizeMathHtml(html: string): string {
  // Hapus script/iframe
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}
