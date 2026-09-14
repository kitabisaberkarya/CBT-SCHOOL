/**
 * docxMathPatch.ts
 * Pre-processor DOCX sebelum mammoth:
 * - Extract document.xml dari zip
 * - Patch OMML → marker teks
 * - Repack menjadi ArrayBuffer baru
 * - Kembalikan { patchedBuffer, latexMap, oleEquationCount }
 */

import * as fflate from 'fflate';
import { patchOmmlInXml } from './omml2latex';

export interface DocxPatchResult {
  patchedBuffer: ArrayBuffer;
  latexMap: Map<string, string>;   // MATH_N → LaTeX string
  oleEquationCount: number;         // Jumlah OLE Equation.3 terdeteksi
  ommlCount: number;                // Jumlah OMML (m:oMath) terdeteksi
}

/** Baca file dari zip menggunakan fflate */
function unzipFile(data: Uint8Array, filename: string): Uint8Array | null {
  try {
    const result = fflate.unzipSync(data);
    return result[filename] ?? null;
  } catch {
    return null;
  }
}

/** Hitung OLE Equation.3 dalam document.xml */
function countOleEquations(xmlStr: string): number {
  const matches = xmlStr.match(/ProgID\s*=\s*["']?Equation\.3["']?/g);
  return matches ? matches.length : 0;
}

/** Hitung OMML m:oMath dalam document.xml */
function countOmml(xmlStr: string): number {
  const matches = xmlStr.match(/<(?:m:)?oMath[\s>]/g);
  return matches ? matches.length : 0;
}

/**
 * Main: patch docx ArrayBuffer.
 * - Ganti semua m:oMath dengan teks marker
 * - Kembalikan docx baru + map LaTeX
 */
export async function patchDocxMath(buffer: ArrayBuffer): Promise<DocxPatchResult> {
  const data = new Uint8Array(buffer);

  // Ekstrak document.xml
  const docXmlBytes = unzipFile(data, 'word/document.xml');
  if (!docXmlBytes) {
    // Gagal baca zip, kembalikan buffer asli tanpa patch
    return {
      patchedBuffer: buffer,
      latexMap: new Map(),
      oleEquationCount: 0,
      ommlCount: 0,
    };
  }

  const docXmlStr = new TextDecoder('utf-8').decode(docXmlBytes);
  const oleCount  = countOleEquations(docXmlStr);
  const ommlCount = countOmml(docXmlStr);

  // Jika tidak ada OMML, tidak perlu patch
  if (ommlCount === 0) {
    return {
      patchedBuffer: buffer,
      latexMap: new Map(),
      oleEquationCount: oleCount,
      ommlCount: 0,
    };
  }

  // Patch: ganti m:oMath dengan marker
  const { patchedXml, latexMap } = patchOmmlInXml(docXmlStr);

  // Repack zip dengan document.xml yang sudah di-patch
  try {
    const originalZip = fflate.unzipSync(data);
    const patchedXmlBytes = new TextEncoder().encode(patchedXml);
    originalZip['word/document.xml'] = patchedXmlBytes;

    // Rezip (compress level 6)
    const repacked = fflate.zipSync(originalZip, {
      level: 6,
    });

    return {
      patchedBuffer: repacked.buffer,
      latexMap,
      oleEquationCount: oleCount,
      ommlCount,
    };
  } catch {
    // Jika repack gagal, kembalikan buffer asli
    return {
      patchedBuffer: buffer,
      latexMap: new Map(),
      oleEquationCount: oleCount,
      ommlCount,
    };
  }
}

/**
 * Post-process HTML dari mammoth:
 * Ganti semua marker MATH_N dengan $LaTeX$ notation.
 */
export function injectLatexIntoHtml(
  html: string,
  latexMap: Map<string, string>
): string {
  let result = html;
  for (const [id, latex] of latexMap) {
    // Marker mungkin ada di dalam tag HTML, perlu escaped atau plain
    // Gunakan regex untuk menangani spasi
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`\\s*${escaped}\\s*`, 'g'),
      latex ? ` $${latex}$ ` : ` [Rumus] `
    );
  }
  return result;
}

/**
 * Buat placeholder PNG untuk WMF/OLE equation image.
 * Kembalikan base64 PNG data URL.
 */
export function makeEquationPlaceholderPng(
  label = '📐 Rumus'
): Promise<string> {
  return new Promise((resolve) => {
    const w = 160, h = 40;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Background
    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(0, 0, w, h);
    // Border
    ctx.strokeStyle = '#F9A825';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.setLineDash([]);
    // Text
    ctx.fillStyle = '#E65100';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2);
    resolve(canvas.toDataURL('image/png'));
  });
}
