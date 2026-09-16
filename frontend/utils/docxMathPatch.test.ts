import { describe, it, expect } from 'vitest';
import { injectLatexIntoHtml } from './docxMathPatch';

/** Bandingkan HTML dengan whitespace dinormalisasi — fungsi ini sengaja
 *  membungkus hasil dengan spasi di sekitar "$...$", yang tidak berpengaruh
 *  secara visual di HTML, jadi tidak perlu dicocokkan karakter-per-karakter. */
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();

describe('injectLatexIntoHtml', () => {
  it('replaces a single marker correctly', () => {
    const html = '<p>Grafik dari MATH_0 digeser</p>';
    const map = new Map([['MATH_0', 'y={x}^{2}+3x']]);
    expect(norm(injectLatexIntoHtml(html, map))).toBe('<p>Grafik dari $y={x}^{2}+3x$ digeser</p>');
  });

  it('does not corrupt double-digit markers when a single-digit marker is a prefix (regression: soal >= 10 rumus)', () => {
    // Skenario nyata: dokumen dengan >=10 rumus. MATH_1 tidak boleh ikut
    // menimpa MATH_10..MATH_19 hanya karena "MATH_1" adalah prefix dari "MATH_10".
    const html = '<p>MATH_0 MATH_1 MATH_9 MATH_10 MATH_11</p>';
    const map = new Map([
      ['MATH_0', 'a'],
      ['MATH_1', 'b'],
      ['MATH_9', 'c'],
      ['MATH_10', 'd'],
      ['MATH_11', 'e'],
    ]);
    const result = injectLatexIntoHtml(html, map);
    expect(norm(result)).toBe('<p>$a$ $b$ $c$ $d$ $e$</p>');
    // Pastikan tidak ada sisa digit "0"/"1" nyasar dari marker yang salah tertimpa
    expect(result).not.toMatch(/\$b\$\s*0/);
    expect(result).not.toMatch(/\$b\$\s*1/);
  });

  it('leaves markers without a mapped latex as a visible placeholder', () => {
    const html = '<p>MATH_5</p>';
    const map = new Map([['MATH_5', '']]);
    expect(norm(injectLatexIntoHtml(html, map))).toBe('<p>[Rumus]</p>');
  });

  it('is a no-op when the map is empty', () => {
    const html = '<p>Tidak ada rumus di sini</p>';
    expect(injectLatexIntoHtml(html, new Map())).toBe(html);
  });
});
