
import React, { useState, useRef } from 'react';

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

// ── CATATAN PENTING UNTUK DEVELOPER ────────────────────────────────────────
// Semua template math menggunakan pola:
//   contenteditable="false"  → membuat formula menjadi atom (tidak bisa diedit di dalam)
//   &#x200B;                 → zero-width space setelah formula agar kursor bisa diposisikan
//                              tepat SETELAH formula, bukan terjebak di dalam elemen span
// ── Ini memperbaiki bug: kursor tidak bisa pindah ke samping rumus ──────────
const TEMPLATES = [
  {
    label: 'Pecahan a/b',
    icon: 'a/b',
    html: '<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.3;font-size:0.95em;margin:0 2px;cursor:default"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;text-align:center;min-width:1em">a</span><span style="padding:0 4px;text-align:center;min-width:1em">b</span></span>&#x200B;',
  },
  {
    label: 'Akar √',
    icon: '√x',
    html: '<span contenteditable="false" style="white-space:nowrap;font-size:0.95em;cursor:default">√<span style="border-top:1.5px solid currentColor;padding-left:2px;padding-right:2px">x</span></span>&#x200B;',
  },
  {
    label: 'Akar ke-n',
    icon: 'ⁿ√x',
    html: '<span contenteditable="false" style="white-space:nowrap;font-size:0.95em;cursor:default"><sup style="font-size:0.65em">n</sup>√<span style="border-top:1.5px solid currentColor;padding-left:2px;padding-right:2px">x</span></span>&#x200B;',
  },
  {
    label: 'Pangkat xⁿ',
    icon: 'xⁿ',
    html: 'x<sup style="font-size:0.75em">n</sup>&#x200B;',
  },
  {
    label: 'Indeks xₙ',
    icon: 'xₙ',
    html: 'x<sub style="font-size:0.75em">n</sub>&#x200B;',
  },
  {
    label: 'Mutlak |x|',
    icon: '|x|',
    html: '|x|&#x200B;',
  },
  {
    label: 'log basis',
    icon: 'logₐb',
    html: 'log<sub style="font-size:0.75em">a</sub>b&#x200B;',
  },
  {
    label: 'lim',
    icon: 'lim',
    html: '<span contenteditable="false" style="cursor:default">lim<sub style="font-size:0.75em">x→0</sub>&thinsp;f(x)</span>&#x200B;',
  },
  {
    label: '∫ integral',
    icon: '∫dx',
    html: '<span contenteditable="false" style="cursor:default">∫f(x)&thinsp;dx</span>&#x200B;',
  },
  {
    label: 'Σ sigma',
    icon: 'Σᵢ',
    html: '<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px;cursor:default"><span style="font-size:0.75em">n</span><span style="font-size:1.3em">Σ</span><span style="font-size:0.75em">i=1</span></span>&thinsp;aᵢ&#x200B;',
  },
  {
    label: 'Vektor',
    icon: 'v⃗',
    html: '<span contenteditable="false" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.95em;cursor:default"><span style="border-top:1.5px solid currentColor;font-size:0.6em;letter-spacing:0.1em;padding:0 2px">→</span><span>AB</span></span>&#x200B;',
  },
  {
    label: 'Matriks 2×2',
    icon: '[ab]',
    html: '<span contenteditable="false" style="display:inline-flex;align-items:center;vertical-align:middle;font-size:0.9em;margin:0 2px;cursor:default"><span style="font-size:1.5em;margin-right:1px">[</span><span style="display:inline-flex;flex-direction:column;line-height:1.6"><span>a &nbsp; b</span><span>c &nbsp; d</span></span><span style="font-size:1.5em;margin-left:1px">]</span></span>&#x200B;',
  },
  {
    label: 'Kombinasi Cₙ',
    icon: 'Cₙₖ',
    html: 'C<sub style="font-size:0.7em">n,k</sub>&#x200B;',
  },
  {
    label: 'Permutasi Pₙ',
    icon: 'Pₙₖ',
    html: 'P<sub style="font-size:0.7em">n,k</sub>&#x200B;',
  },
];

const MathPalette: React.FC<MathPaletteProps> = ({ onInsert, onInsertHtml, onSuperscript, onSubscript }) => {
  const [activeTab, setActiveTab] = useState('dasar');
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = Math.min(420, window.innerWidth - 16);
      let left = rect.left;
      if (left + panelWidth > window.innerWidth) {
        left = Math.max(8, window.innerWidth - panelWidth - 8);
      }
      // Estimasi tinggi panel agar tidak terpotong di bagian bawah layar
      const estimatedPanelHeight = 380;
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
    }
    setIsOpen(prev => !prev);
  };

  const handleSymbol = (s: string) => {
    onInsert(s);
  };

  const handleTemplate = (html: string) => {
    onInsertHtml(html);
    setIsOpen(false);
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

      {/* Palette Panel — fixed so it's not clipped by scrollable parents */}
      {isOpen && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[300]"
          style={panelStyle}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
            <span className="text-white text-xs font-bold tracking-wider uppercase">Simbol & Rumus Matematika</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

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
                  onMouseDown={(e) => { e.preventDefault(); handleTemplate(t.html); }}
                  className="px-1.5 py-0.5 bg-white border border-purple-200 rounded text-xs font-mono text-purple-700 hover:bg-purple-50 transition-colors"
                  title={t.label}
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
            <p className="text-[10px] text-gray-400">Klik simbol untuk menyisipkan. Gunakan Superscript/Subscript untuk pangkat & indeks.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathPalette;
