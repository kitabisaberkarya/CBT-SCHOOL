
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface MathPaletteProps {
  onInsert: (text: string) => void;
  onInsertHtml: (html: string) => void;
  onSuperscript: () => void;
  onSubscript: () => void;
}

const CATEGORIES = [
  {
    id: 'dasar',
    label: 'Dasar',
    symbols: [
      { s: '±', t: 'Plus-minus' }, { s: '∓', t: 'Minus-plus' },
      { s: '×', t: 'Kali' }, { s: '÷', t: 'Bagi' },
      { s: '≠', t: 'Tidak sama dengan' }, { s: '≈', t: 'Mendekati' },
      { s: '≡', t: 'Identik' }, { s: '≤', t: 'Kurang dari atau sama dengan' },
      { s: '≥', t: 'Lebih dari atau sama dengan' }, { s: '≪', t: 'Jauh lebih kecil' },
      { s: '≫', t: 'Jauh lebih besar' }, { s: '∝', t: 'Sebanding dengan' },
      { s: '∞', t: 'Tak terhingga' }, { s: '·', t: 'Titik tengah (kali)' },
      { s: '⋅', t: 'Dot product' }, { s: '∣', t: 'Garis mutlak/habis dibagi' },
      { s: '∤', t: 'Tidak habis dibagi' }, { s: '%', t: 'Persen' },
      { s: '‰', t: 'Per mil' }, { s: '°', t: 'Derajat' },
      { s: '′', t: 'Menit / turunan pertama' }, { s: '″', t: 'Detik / turunan kedua' },
      { s: '¹', t: 'Pangkat 1' }, { s: '²', t: 'Pangkat 2' },
      { s: '³', t: 'Pangkat 3' }, { s: '⁴', t: 'Pangkat 4' },
      { s: 'ⁿ', t: 'Pangkat n' }, { s: '½', t: 'Setengah' },
      { s: '⅓', t: 'Sepertiga' }, { s: '¼', t: 'Seperempat' },
      { s: '⅔', t: 'Dua pertiga' }, { s: '¾', t: 'Tiga perempat' },
    ],
  },
  {
    id: 'yunani',
    label: 'Yunani',
    symbols: [
      { s: 'α', t: 'Alpha (kecil)' }, { s: 'β', t: 'Beta (kecil)' },
      { s: 'γ', t: 'Gamma (kecil)' }, { s: 'δ', t: 'Delta (kecil)' },
      { s: 'ε', t: 'Epsilon (kecil)' }, { s: 'ζ', t: 'Zeta (kecil)' },
      { s: 'η', t: 'Eta (kecil)' }, { s: 'θ', t: 'Theta (kecil)' },
      { s: 'ι', t: 'Iota (kecil)' }, { s: 'κ', t: 'Kappa (kecil)' },
      { s: 'λ', t: 'Lambda (kecil)' }, { s: 'μ', t: 'Mu (kecil)' },
      { s: 'ν', t: 'Nu (kecil)' }, { s: 'ξ', t: 'Xi (kecil)' },
      { s: 'π', t: 'Pi (kecil)' }, { s: 'ρ', t: 'Rho (kecil)' },
      { s: 'σ', t: 'Sigma (kecil)' }, { s: 'τ', t: 'Tau (kecil)' },
      { s: 'υ', t: 'Upsilon (kecil)' }, { s: 'φ', t: 'Phi (kecil)' },
      { s: 'χ', t: 'Chi (kecil)' }, { s: 'ψ', t: 'Psi (kecil)' },
      { s: 'ω', t: 'Omega (kecil)' },
      { s: 'Α', t: 'Alpha (besar)' }, { s: 'Β', t: 'Beta (besar)' },
      { s: 'Γ', t: 'Gamma (besar)' }, { s: 'Δ', t: 'Delta (besar)' },
      { s: 'Ε', t: 'Epsilon (besar)' }, { s: 'Θ', t: 'Theta (besar)' },
      { s: 'Λ', t: 'Lambda (besar)' }, { s: 'Ξ', t: 'Xi (besar)' },
      { s: 'Π', t: 'Pi (besar)' }, { s: 'Σ', t: 'Sigma (besar)' },
      { s: 'Φ', t: 'Phi (besar)' }, { s: 'Ψ', t: 'Psi (besar)' },
      { s: 'Ω', t: 'Omega (besar)' },
    ],
  },
  {
    id: 'kalkulus',
    label: 'Kalkulus',
    symbols: [
      { s: '∫', t: 'Integral' }, { s: '∬', t: 'Integral ganda' },
      { s: '∭', t: 'Integral triple' }, { s: '∮', t: 'Integral kurva tertutup' },
      { s: '∂', t: 'Turunan parsial' }, { s: '∇', t: 'Nabla/Gradien' },
      { s: '∆', t: 'Delta (perubahan)' }, { s: '∑', t: 'Sigma/Jumlahan' },
      { s: '∏', t: 'Pi/Perkalian' }, { s: '√', t: 'Akar kuadrat' },
      { s: '∛', t: 'Akar kubik' }, { s: '∜', t: 'Akar keempat' },
      { s: '∞', t: 'Tak terhingga' }, { s: 'ℯ', t: 'Bilangan Euler (e)' },
      { s: 'ℓ', t: 'Panjang (ell)' }, { s: 'ℕ', t: 'Bilangan Asli' },
      { s: 'ℤ', t: 'Bilangan Bulat' }, { s: 'ℚ', t: 'Bilangan Rasional' },
      { s: 'ℝ', t: 'Bilangan Real' }, { s: 'ℂ', t: 'Bilangan Kompleks' },
      { s: '∅', t: 'Himpunan kosong' }, { s: 'dx', t: 'diferensial x' },
      { s: 'dy', t: 'diferensial y' }, { s: 'dt', t: 'diferensial t' },
    ],
  },
  {
    id: 'himpunan',
    label: 'Himpunan & Logika',
    symbols: [
      { s: '∈', t: 'Anggota dari' }, { s: '∉', t: 'Bukan anggota dari' },
      { s: '⊂', t: 'Himpunan bagian (sejati)' }, { s: '⊃', t: 'Memuat (sejati)' },
      { s: '⊆', t: 'Himpunan bagian atau sama' }, { s: '⊇', t: 'Memuat atau sama' },
      { s: '∪', t: 'Gabungan (Union)' }, { s: '∩', t: 'Irisan (Intersection)' },
      { s: '∁', t: 'Komplemen' }, { s: '∀', t: 'Untuk semua' },
      { s: '∃', t: 'Ada/Terdapat' }, { s: '∄', t: 'Tidak ada' },
      { s: '∧', t: 'Dan (konjungsi)' }, { s: '∨', t: 'Atau (disjungsi)' },
      { s: '¬', t: 'Tidak/Negasi' }, { s: '⊕', t: 'XOR / disjungsi eksklusif' },
      { s: '⊗', t: 'Tensor product' }, { s: '⊥', t: 'Tegak lurus / kontradiksi' },
      { s: '⊤', t: 'Tautologi' }, { s: '⊢', t: 'Membuktikan' },
      { s: '⊨', t: 'Model / akibatkan' }, { s: '|', t: 'Seperti bahwa / habis dibagi' },
      { s: '∴', t: 'Oleh karena itu' }, { s: '∵', t: 'Karena' },
    ],
  },
  {
    id: 'geometri',
    label: 'Geometri',
    symbols: [
      { s: '∠', t: 'Sudut' }, { s: '∡', t: 'Sudut terukur' },
      { s: '∟', t: 'Sudut siku-siku' }, { s: '⊥', t: 'Tegak lurus' },
      { s: '∥', t: 'Sejajar' }, { s: '∦', t: 'Tidak sejajar' },
      { s: '≅', t: 'Kongruen' }, { s: '∼', t: 'Sebangun' },
      { s: '△', t: 'Segitiga' }, { s: '□', t: 'Persegi' },
      { s: '○', t: 'Lingkaran' }, { s: '⊙', t: 'Titik pada lingkaran' },
      { s: 'π', t: 'Pi (3.14159...)' }, { s: '°', t: 'Derajat sudut' },
      { s: '′', t: 'Menit (sudut)' }, { s: '″', t: 'Detik (sudut)' },
      { s: 'rad', t: 'Radian' }, { s: 'AB̄', t: 'Ruas garis AB' },
      { s: '→', t: 'Sinar/Vektor' }, { s: '⃗', t: 'Vektor (kombinasikan dengan huruf)' },
      { s: '|AB|', t: 'Panjang AB' }, { s: '⌀', t: 'Diameter' },
      { s: 'ℛ', t: 'Jari-jari' },
    ],
  },
  {
    id: 'panah',
    label: 'Panah & Relasi',
    symbols: [
      { s: '→', t: 'Panah kanan (implikasi)' }, { s: '←', t: 'Panah kiri' },
      { s: '↑', t: 'Panah atas' }, { s: '↓', t: 'Panah bawah' },
      { s: '↔', t: 'Panah dua arah' }, { s: '↕', t: 'Panah atas bawah' },
      { s: '⇒', t: 'Implikasi kanan (tebal)' }, { s: '⇐', t: 'Implikasi kiri (tebal)' },
      { s: '⇔', t: 'Jika dan hanya jika' }, { s: '⟹', t: 'Implikasi panjang' },
      { s: '⟺', t: 'Ekuivalensi panjang' }, { s: '↦', t: 'Memetakan ke' },
      { s: '↪', t: 'Injeksi' }, { s: '↠', t: 'Surjeksi' },
      { s: '↺', t: 'Rotasi berlawanan jarum jam' }, { s: '↻', t: 'Rotasi searah jarum jam' },
      { s: '≈', t: 'Mendekati' }, { s: '≃', t: 'Homeomorfis' },
      { s: '≄', t: 'Tidak homeomorfis' }, { s: '≇', t: 'Tidak kongruen' },
    ],
  },
];

// ── Escape HTML untuk keamanan input user ───────────────────────────────────
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Definisi setiap template beserta field input dan generator HTML ───────────
interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  defaultVal: string;
  width?: string; // opsional: lebar input ('full' | 'half')
}

interface TemplateDef {
  label: string;
  icon: string;
  fields: TemplateField[];
  generateHtml: (v: Record<string, string>) => string;
}

const TEMPLATES: TemplateDef[] = [
  {
    label: 'Pecahan a/b',
    icon: 'a/b',
    fields: [
      { key: 'num', label: 'Pembilang (atas)', placeholder: 'contoh: 1', defaultVal: 'a' },
      { key: 'den', label: 'Penyebut (bawah)', placeholder: 'contoh: 4', defaultVal: 'b' },
    ],
    generateHtml: (v) => {
      const num = esc(v.num || 'a');
      const den = esc(v.den || 'b');
      return `<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.3;font-size:0.95em;margin:0 2px;cursor:default"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;text-align:center;min-width:1em">${num}</span><span style="padding:0 4px;text-align:center;min-width:1em">${den}</span></span>&#x200B;`;
    },
  },
  {
    label: 'Akar √',
    icon: '√x',
    fields: [
      { key: 'val', label: 'Nilai dalam akar', placeholder: 'contoh: 16', defaultVal: 'x' },
    ],
    generateHtml: (v) => {
      const val = esc(v.val || 'x');
      return `<span contenteditable="false" style="white-space:nowrap;font-size:0.95em;cursor:default">√<span style="border-top:1.5px solid currentColor;padding-left:2px;padding-right:2px">${val}</span></span>&#x200B;`;
    },
  },
  {
    label: 'Akar ke-n',
    icon: 'ⁿ√x',
    fields: [
      { key: 'n', label: 'Derajat akar', placeholder: 'contoh: 3', defaultVal: 'n', width: 'half' },
      { key: 'val', label: 'Nilai dalam akar', placeholder: 'contoh: 27', defaultVal: 'x', width: 'half' },
    ],
    generateHtml: (v) => {
      const n = esc(v.n || 'n');
      const val = esc(v.val || 'x');
      return `<span contenteditable="false" style="white-space:nowrap;font-size:0.95em;cursor:default"><sup style="font-size:0.65em">${n}</sup>√<span style="border-top:1.5px solid currentColor;padding-left:2px;padding-right:2px">${val}</span></span>&#x200B;`;
    },
  },
  {
    label: 'Pangkat xⁿ',
    icon: 'xⁿ',
    fields: [
      { key: 'base', label: 'Basis', placeholder: 'contoh: 2', defaultVal: 'x', width: 'half' },
      { key: 'exp', label: 'Pangkat', placeholder: 'contoh: 3', defaultVal: 'n', width: 'half' },
    ],
    generateHtml: (v) => {
      const base = esc(v.base || 'x');
      const exp = esc(v.exp || 'n');
      return `${base}<sup style="font-size:0.75em">${exp}</sup>&#x200B;`;
    },
  },
  {
    label: 'Indeks xₙ',
    icon: 'xₙ',
    fields: [
      { key: 'var', label: 'Variabel', placeholder: 'contoh: a', defaultVal: 'x', width: 'half' },
      { key: 'idx', label: 'Indeks', placeholder: 'contoh: 1', defaultVal: 'n', width: 'half' },
    ],
    generateHtml: (v) => {
      const varVal = esc(v.var || 'x');
      const idx = esc(v.idx || 'n');
      return `${varVal}<sub style="font-size:0.75em">${idx}</sub>&#x200B;`;
    },
  },
  {
    label: 'Mutlak |x|',
    icon: '|x|',
    fields: [
      { key: 'val', label: 'Nilai', placeholder: 'contoh: -5', defaultVal: 'x' },
    ],
    generateHtml: (v) => {
      const val = esc(v.val || 'x');
      return `|${val}|&#x200B;`;
    },
  },
  {
    label: 'log basis',
    icon: 'logₐb',
    fields: [
      { key: 'base', label: 'Basis log', placeholder: 'contoh: 2', defaultVal: 'a', width: 'half' },
      { key: 'val', label: 'Nilai', placeholder: 'contoh: 8', defaultVal: 'b', width: 'half' },
    ],
    generateHtml: (v) => {
      const base = esc(v.base || 'a');
      const val = esc(v.val || 'b');
      return `log<sub style="font-size:0.75em">${base}</sub>${val}&#x200B;`;
    },
  },
  {
    label: 'lim',
    icon: 'lim',
    fields: [
      { key: 'var', label: 'Variabel', placeholder: 'contoh: x', defaultVal: 'x', width: 'half' },
      { key: 'to', label: 'Mendekati', placeholder: 'contoh: 0', defaultVal: '0', width: 'half' },
      { key: 'expr', label: 'Fungsi', placeholder: 'contoh: f(x)', defaultVal: 'f(x)' },
    ],
    generateHtml: (v) => {
      const varVal = esc(v.var || 'x');
      const to = esc(v.to || '0');
      const expr = esc(v.expr || 'f(x)');
      return `<span contenteditable="false" style="cursor:default">lim<sub style="font-size:0.75em">${varVal}→${to}</sub>&thinsp;${expr}</span>&#x200B;`;
    },
  },
  {
    label: '∫ integral',
    icon: '∫dx',
    fields: [
      { key: 'expr', label: 'Fungsi', placeholder: 'contoh: f(x)', defaultVal: 'f(x)' },
      { key: 'var', label: 'Variabel integral', placeholder: 'contoh: x', defaultVal: 'x' },
    ],
    generateHtml: (v) => {
      const expr = esc(v.expr || 'f(x)');
      const varVal = esc(v.var || 'x');
      return `<span contenteditable="false" style="cursor:default">∫${expr}&thinsp;d${varVal}</span>&#x200B;`;
    },
  },
  {
    label: 'Σ sigma',
    icon: 'Σᵢ',
    fields: [
      { key: 'from', label: 'Batas bawah', placeholder: 'contoh: i=1', defaultVal: 'i=1', width: 'half' },
      { key: 'to', label: 'Batas atas', placeholder: 'contoh: n', defaultVal: 'n', width: 'half' },
      { key: 'expr', label: 'Ekspresi', placeholder: 'contoh: aᵢ', defaultVal: 'aᵢ' },
    ],
    generateHtml: (v) => {
      const from = esc(v.from || 'i=1');
      const to = esc(v.to || 'n');
      const expr = esc(v.expr || 'aᵢ');
      return `<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px;cursor:default"><span style="font-size:0.75em">${to}</span><span style="font-size:1.3em">Σ</span><span style="font-size:0.75em">${from}</span></span>&thinsp;${expr}&#x200B;`;
    },
  },
  {
    label: 'Vektor',
    icon: 'v⃗',
    fields: [
      { key: 'from', label: 'Titik awal', placeholder: 'contoh: A', defaultVal: 'A', width: 'half' },
      { key: 'to', label: 'Titik akhir', placeholder: 'contoh: B', defaultVal: 'B', width: 'half' },
    ],
    generateHtml: (v) => {
      const from = esc(v.from || 'A');
      const to = esc(v.to || 'B');
      return `<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.95em;cursor:default"><span style="border-top:1.5px solid currentColor;font-size:0.6em;letter-spacing:0.1em;padding:0 2px">→</span><span>${from}${to}</span></span>&#x200B;`;
    },
  },
  {
    label: 'Matriks 2×2',
    icon: '[ab]',
    fields: [
      { key: 'a', label: 'Baris 1 Kol 1', placeholder: 'a', defaultVal: 'a', width: 'half' },
      { key: 'b', label: 'Baris 1 Kol 2', placeholder: 'b', defaultVal: 'b', width: 'half' },
      { key: 'c', label: 'Baris 2 Kol 1', placeholder: 'c', defaultVal: 'c', width: 'half' },
      { key: 'd', label: 'Baris 2 Kol 2', placeholder: 'd', defaultVal: 'd', width: 'half' },
    ],
    generateHtml: (v) => {
      const a = esc(v.a || 'a'); const b = esc(v.b || 'b');
      const c = esc(v.c || 'c'); const d = esc(v.d || 'd');
      return `<span contenteditable="false" style="display:inline-flex;align-items:center;vertical-align:middle;font-size:0.9em;margin:0 2px;cursor:default"><span style="font-size:1.5em;margin-right:1px">[</span><span style="display:inline-flex;flex-direction:column;line-height:1.6"><span>${a} &nbsp; ${b}</span><span>${c} &nbsp; ${d}</span></span><span style="font-size:1.5em;margin-left:1px">]</span></span>&#x200B;`;
    },
  },
  {
    label: 'Kombinasi Cₙ',
    icon: 'Cₙₖ',
    fields: [
      { key: 'n', label: 'n', placeholder: 'contoh: 5', defaultVal: 'n', width: 'half' },
      { key: 'k', label: 'k', placeholder: 'contoh: 2', defaultVal: 'k', width: 'half' },
    ],
    generateHtml: (v) => {
      const n = esc(v.n || 'n'); const k = esc(v.k || 'k');
      return `C<sub style="font-size:0.7em">${n},${k}</sub>&#x200B;`;
    },
  },
  {
    label: 'Permutasi Pₙ',
    icon: 'Pₙₖ',
    fields: [
      { key: 'n', label: 'n', placeholder: 'contoh: 5', defaultVal: 'n', width: 'half' },
      { key: 'k', label: 'k', placeholder: 'contoh: 2', defaultVal: 'k', width: 'half' },
    ],
    generateHtml: (v) => {
      const n = esc(v.n || 'n'); const k = esc(v.k || 'k');
      return `P<sub style="font-size:0.7em">${n},${k}</sub>&#x200B;`;
    },
  },
];

// ── Komponen mini editor rumus (muncul setelah template dipilih) ─────────────
interface EquationEditorProps {
  template: TemplateDef;
  onInsert: (html: string) => void;
  onBack: () => void;
}

const EquationEditor: React.FC<EquationEditorProps> = ({ template, onInsert, onBack }) => {
  const initValues = template.fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});
  const [values, setValues] = useState<Record<string, string>>(initValues);

  const previewHtml = template.generateHtml(
    template.fields.reduce<Record<string, string>>((acc, f) => {
      acc[f.key] = values[f.key] || f.defaultVal;
      return acc;
    }, {})
  );

  const handleInsert = () => {
    onInsert(previewHtml);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Judul + tombol kembali */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onBack(); }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Kembali
        </button>
        <span className="text-xs font-bold text-gray-600">— {template.label}</span>
      </div>

      {/* Input fields */}
      <div className="flex flex-wrap gap-2">
        {template.fields.map((f) => (
          <div
            key={f.key}
            className={f.width === 'half' ? 'w-[calc(50%-4px)]' : 'w-full'}
          >
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
              {f.label}
            </label>
            <input
              type="text"
              value={values[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      {/* Preview live */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Preview Rumus</p>
        <div
          className="text-base text-gray-800 min-h-[2rem] flex items-center"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* Tombol sisipkan */}
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleInsert(); }}
        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        Sisipkan ke Soal
      </button>
    </div>
  );
};

// ── Komponen utama MathPalette ───────────────────────────────────────────────
const MathPalette: React.FC<MathPaletteProps> = ({ onInsert, onInsertHtml, onSuperscript, onSubscript }) => {
  const [activeTab, setActiveTab] = useState('dasar');
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDef | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // ── Drag state ────────────────────────────────────────────────────────────
  const popupRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Jangan mulai drag jika klik pada tombol/input dalam header
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    isDragging.current = true;
    const rect = popupRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    setDragPos({
      x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 100)),
      y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 60)),
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = Math.min(420, window.innerWidth - 16);
      let left = rect.left;
      if (left + panelWidth > window.innerWidth) {
        left = Math.max(8, window.innerWidth - panelWidth - 8);
      }
      const estimatedPanelHeight = 420;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const showAbove = spaceBelow < estimatedPanelHeight && rect.top > estimatedPanelHeight;
      const top = showAbove
        ? Math.max(8, rect.top - estimatedPanelHeight - 4)
        : rect.bottom + 4;
      setPanelStyle({
        top,
        left,
        width: panelWidth,
        maxHeight: showAbove
          ? `${rect.top - 12}px`
          : `calc(100vh - ${top + 8}px)`,
        overflowY: 'auto',
      });
      // Reset posisi drag setiap kali panel dibuka ulang
      setDragPos({ x: null, y: null });
    }
    setIsOpen(prev => !prev);
    setSelectedTemplate(null);
  };

  const handleSymbol = (s: string) => {
    onInsert(s);
  };

  const handleTemplateClick = (tpl: TemplateDef) => {
    setSelectedTemplate(tpl);
  };

  const handleInsertFromEditor = (html: string) => {
    onInsertHtml(html);
    setIsOpen(false);
    setSelectedTemplate(null);
  };

  const activeCategory = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        ref={btnRef}
        type="button"
        onMouseDown={handleToggle}
        className={`p-1.5 rounded transition-colors font-mono text-sm font-bold ${isOpen ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
        title="Simbol Matematika & Rumus"
      >
        Σ
      </button>

      {/* Palette Panel */}
      {isOpen && (
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[300]"
          style={
            dragPos.x !== null
              ? { position: 'fixed', left: dragPos.x, top: dragPos.y, width: panelStyle.width, maxHeight: panelStyle.maxHeight, overflowY: 'auto', zIndex: 300 }
              : panelStyle
          }
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Header — area drag */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl select-none"
            style={{ cursor: 'move' }}
            onMouseDown={handleDragStart}
          >
            <span className="text-white text-xs font-bold tracking-wider uppercase pointer-events-none">
              {selectedTemplate ? `Editor Rumus — ${selectedTemplate.label}` : 'Simbol & Rumus Matematika'}
            </span>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSelectedTemplate(null); }}
              className="text-white/70 hover:text-white text-lg leading-none"
              style={{ cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          {/* ── Mode: Editor Rumus (setelah template dipilih) ── */}
          {selectedTemplate ? (
            <EquationEditor
              template={selectedTemplate}
              onInsert={handleInsertFromEditor}
              onBack={() => setSelectedTemplate(null)}
            />
          ) : (
            <>
              {/* Quick Actions: Superscript / Subscript */}
              <div className="flex items-center gap-1 px-3 py-2 bg-blue-50 border-b border-blue-100">
                <span className="text-[10px] text-blue-500 font-bold uppercase mr-1">Teks:</span>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSuperscript(); }}
                  className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                  title="Superscript (pangkat)"
                >
                  x<sup>n</sup>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSubscript(); }}
                  className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                  title="Subscript (indeks)"
                >
                  x<sub>n</sub>
                </button>
                <span className="text-[10px] text-blue-500 font-bold uppercase mx-1">Template:</span>
                <div className="flex flex-wrap gap-1">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleTemplateClick(t); }}
                      className="px-1.5 py-0.5 bg-white border border-purple-200 rounded text-xs font-mono text-purple-700 hover:bg-purple-100 hover:border-purple-400 transition-colors"
                      title={`${t.label} — klik untuk isi nilai`}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setActiveTab(cat.id); }}
                    className={`flex-shrink-0 px-3 py-2 text-[11px] font-semibold transition-colors border-b-2 ${
                      activeTab === cat.id
                        ? 'border-blue-500 text-blue-700 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Symbol Grid */}
              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {activeCategory?.symbols.map((sym) => (
                    <button
                      key={sym.s}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSymbol(sym.s); }}
                      className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded text-base font-mono transition-colors"
                      title={sym.t}
                    >
                      {sym.s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-3 py-1.5 bg-gray-50 rounded-b-xl border-t border-gray-100">
                <p className="text-[10px] text-gray-400">Klik simbol untuk sisipkan langsung. Klik template rumus untuk mengisi nilainya terlebih dahulu.</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MathPalette;
