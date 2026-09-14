/**
 * omml2latex.ts
 * Converter dari OMML (Office Math Markup Language / m:oMath) ke LaTeX.
 * Menangani elemen-elemen umum yang dihasilkan Microsoft Equation Editor Word modern.
 */

const NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// Peta simbol OMML → LaTeX
const NARY_CHR_MAP: Record<string, string> = {
  '∑': '\\sum',
  '∫': '\\int',
  '∬': '\\iint',
  '∭': '\\iiint',
  '∮': '\\oint',
  '∏': '\\prod',
  '∐': '\\coprod',
  '⋃': '\\bigcup',
  '⋂': '\\bigcap',
  '⋁': '\\bigvee',
  '⋀': '\\bigwedge',
};

const ACCENT_CHR_MAP: Record<string, string> = {
  '̂': '\\hat',  // combining hat
  '̄': '\\bar',  // combining macron
  '̃': '\\tilde',
  '̇': '\\dot',
  '̈': '\\ddot',
  '⃗': '\\vec',
  '→': '\\vec',
};

const SYMBOL_MAP: Record<string, string> = {
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '±': '\\pm', '∓': '\\mp',
  '×': '\\times', '÷': '\\div', '·': '\\cdot', '∞': '\\infty',
  '√': '\\sqrt', '∂': '\\partial', '∇': '\\nabla', '∆': '\\Delta',
  'π': '\\pi', 'θ': '\\theta', 'α': '\\alpha', 'β': '\\beta',
  'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon', 'ζ': '\\zeta',
  'η': '\\eta', 'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu',
  'ξ': '\\xi', 'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau',
  'φ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi',
  'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊃': '\\supset',
  '⊆': '\\subseteq', '⊇': '\\supseteq', '∅': '\\emptyset',
  '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
  '≈': '\\approx', '≡': '\\equiv', '∝': '\\propto',
  '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil',
};

function escapeLatex(text: string): string {
  // Escape karakter LaTeX special, lalu replace simbol matematika
  let result = '';
  for (const ch of text) {
    if (SYMBOL_MAP[ch]) {
      result += SYMBOL_MAP[ch] + ' ';
    } else if (ch === '_') {
      result += '\\_';
    } else if (ch === '^') {
      result += '\\^{}';
    } else if (ch === '{') {
      result += '\\{';
    } else if (ch === '}') {
      result += '\\}';
    } else if (ch === '&') {
      result += '\\&';
    } else if (ch === '#') {
      result += '\\#';
    } else if (ch === '%') {
      result += '\\%';
    } else if (ch === '$') {
      result += '\\$';
    } else {
      result += ch;
    }
  }
  return result;
}

function getAttr(el: Element, localName: string, ns = NS_M): string {
  return el.getAttributeNS(ns, localName) || el.getAttribute('m:' + localName) || '';
}

function getChildrenByLocalName(el: Element, localName: string): Element[] {
  return Array.from(el.children).filter(c =>
    c.localName === localName || c.localName === 'm:' + localName
  );
}

function getFirstChild(el: Element, localName: string): Element | null {
  return getChildrenByLocalName(el, localName)[0] ?? null;
}

/** Rekursif: konversi satu node OMML ke string LaTeX */
export function ommlNodeToLatex(node: Element): string {
  const tag = node.localName.replace(/^m:/, '');

  switch (tag) {
    case 'oMath':
    case 'oMathPara':
      return Array.from(node.children).map(ommlNodeToLatex).join('');

    // Text run
    case 'r': {
      const rPr = getFirstChild(node, 'rPr');
      const isNormal = rPr ? (getAttr(rPr, 'nor') !== '' || getChildrenByLocalName(rPr, 'nor').length > 0) : false;
      const tEls = getChildrenByLocalName(node, 't');
      const text = tEls.map(t => t.textContent || '').join('');
      if (isNormal) return `\\text{${text}}`;
      return escapeLatex(text);
    }

    case 't':
      return escapeLatex(node.textContent || '');

    // Fraction: m:f → \frac{num}{den}
    case 'f': {
      const num = getFirstChild(node, 'num');
      const den = getFirstChild(node, 'den');
      const fPr = getFirstChild(node, 'fPr');
      const fType = fPr ? getAttr(getFirstChild(fPr, 'type') || fPr, 'val') : '';
      const numStr = num ? Array.from(num.children).map(ommlNodeToLatex).join('') : '';
      const denStr = den ? Array.from(den.children).map(ommlNodeToLatex).join('') : '';
      if (fType === 'lin') return `${numStr}/${denStr}`;
      if (fType === 'skw') return `{}^{${numStr}}/{}_{${denStr}}`;
      if (fType === 'noBar') return `\\binom{${numStr}}{${denStr}}`;
      return `\\frac{${numStr}}{${denStr}}`;
    }

    // Superscript: m:sSup
    case 'sSup': {
      const base = getFirstChild(node, 'e');
      const sup  = getFirstChild(node, 'sup');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      const supStr  = sup  ? Array.from(sup.children).map(ommlNodeToLatex).join('') : '';
      return `{${baseStr}}^{${supStr}}`;
    }

    // Subscript: m:sSub
    case 'sSub': {
      const base = getFirstChild(node, 'e');
      const sub  = getFirstChild(node, 'sub');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      const subStr  = sub  ? Array.from(sub.children).map(ommlNodeToLatex).join('') : '';
      return `{${baseStr}}_{${subStr}}`;
    }

    // Sub+Sup: m:sSubSup
    case 'sSubSup': {
      const base = getFirstChild(node, 'e');
      const sub  = getFirstChild(node, 'sub');
      const sup  = getFirstChild(node, 'sup');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      const subStr  = sub  ? Array.from(sub.children).map(ommlNodeToLatex).join('') : '';
      const supStr  = sup  ? Array.from(sup.children).map(ommlNodeToLatex).join('') : '';
      return `{${baseStr}}_{${subStr}}^{${supStr}}`;
    }

    // Radical: m:rad → \sqrt[deg]{base}
    case 'rad': {
      const radPr = getFirstChild(node, 'radPr');
      const degHide = radPr ? getChildrenByLocalName(radPr, 'degHide') : [];
      const deg  = getFirstChild(node, 'deg');
      const base = getFirstChild(node, 'e');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      if (degHide.length > 0 || !deg) return `\\sqrt{${baseStr}}`;
      const degStr = deg ? Array.from(deg.children).map(ommlNodeToLatex).join('') : '';
      if (!degStr.trim()) return `\\sqrt{${baseStr}}`;
      return `\\sqrt[${degStr}]{${baseStr}}`;
    }

    // N-ary operator (sum, integral, etc.): m:nary
    case 'nary': {
      const naryPr = getFirstChild(node, 'naryPr');
      const chrEl = naryPr ? getFirstChild(naryPr, 'chr') : null;
      const chrVal = chrEl ? getAttr(chrEl, 'val') : '∑';
      const latexOp = NARY_CHR_MAP[chrVal] || '\\sum';
      const sub  = getFirstChild(node, 'sub');
      const sup  = getFirstChild(node, 'sup');
      const base = getFirstChild(node, 'e');
      const subStr  = sub  ? Array.from(sub.children).map(ommlNodeToLatex).join('') : '';
      const supStr  = sup  ? Array.from(sup.children).map(ommlNodeToLatex).join('') : '';
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      let result = latexOp;
      if (subStr) result += `_{${subStr}}`;
      if (supStr) result += `^{${supStr}}`;
      result += ` ${baseStr}`;
      return result;
    }

    // Function: m:func → \funcname(arg)
    case 'func': {
      const fname = getFirstChild(node, 'fName');
      const base  = getFirstChild(node, 'e');
      const fnameStr = fname ? Array.from(fname.children).map(ommlNodeToLatex).join('') : '';
      const baseStr  = base  ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      return `${fnameStr}\\left(${baseStr}\\right)`;
    }

    // Delimiter: m:d → \left( ... \right)
    case 'd': {
      const dPr  = getFirstChild(node, 'dPr');
      const begChr = dPr ? getAttr(getFirstChild(dPr, 'begChr') || dPr, 'val') : '(';
      const endChr = dPr ? getAttr(getFirstChild(dPr, 'endChr') || dPr, 'val') : ')';
      const begLatex = begChr === '[' ? '\\left[' : begChr === '{' ? '\\left\\{' : begChr === '|' ? '\\left|' : '\\left(';
      const endLatex = endChr === ']' ? '\\right]' : endChr === '}' ? '\\right\\}' : endChr === '|' ? '\\right|' : '\\right)';
      const inner = getChildrenByLocalName(node, 'e')
        .map(e => Array.from(e.children).map(ommlNodeToLatex).join('')).join(',');
      return `${begLatex}${inner}${endLatex}`;
    }

    // Equation array / matrix base: m:eqArr → aligned
    case 'eqArr': {
      const rows = getChildrenByLocalName(node, 'e')
        .map(e => Array.from(e.children).map(ommlNodeToLatex).join(''));
      return `\\begin{aligned}${rows.join(' \\\\ ')}\\end{aligned}`;
    }

    // Matrix: m:m
    case 'm': {
      const rows = getChildrenByLocalName(node, 'mr')
        .map(mr => getChildrenByLocalName(mr, 'e')
          .map(e => Array.from(e.children).map(ommlNodeToLatex).join('')).join(' & ')
        );
      const mPr   = getFirstChild(node, 'mPr');
      const mType = mPr ? getAttr(getFirstChild(mPr, 'mType') || mPr, 'val') : '';
      if (mType === 'undBrace') return `\\underbrace{${rows.join(' \\\\ ')}}`;
      if (mType === 'ovBrace')  return `\\overbrace{${rows.join(' \\\\ ')}}`;
      return `\\begin{pmatrix}${rows.join(' \\\\ ')}\\end{pmatrix}`;
    }

    // Accent: m:acc → \hat{x} etc.
    case 'acc': {
      const accPr = getFirstChild(node, 'accPr');
      const chrEl = accPr ? getFirstChild(accPr, 'chr') : null;
      const chrVal = chrEl ? getAttr(chrEl, 'val') : '̂';
      const latexAcc = ACCENT_CHR_MAP[chrVal] || '\\hat';
      const base = getFirstChild(node, 'e');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      return `${latexAcc}{${baseStr}}`;
    }

    // Bar: m:bar → \overline or \underline
    case 'bar': {
      const barPr = getFirstChild(node, 'barPr');
      const posEl = barPr ? getFirstChild(barPr, 'pos') : null;
      const pos = posEl ? getAttr(posEl, 'val') : 'top';
      const base = getFirstChild(node, 'e');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      return pos === 'bot' ? `\\underline{${baseStr}}` : `\\overline{${baseStr}}`;
    }

    // Limit-lower: m:limLow → \underset
    case 'limLow': {
      const base = getFirstChild(node, 'e');
      const lim  = getFirstChild(node, 'lim');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      const limStr  = lim  ? Array.from(lim.children).map(ommlNodeToLatex).join('') : '';
      return `\\underset{${limStr}}{${baseStr}}`;
    }

    // Limit-upper: m:limUpp → \overset
    case 'limUpp': {
      const base = getFirstChild(node, 'e');
      const lim  = getFirstChild(node, 'lim');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      const limStr  = lim  ? Array.from(lim.children).map(ommlNodeToLatex).join('') : '';
      return `\\overset{${limStr}}{${baseStr}}`;
    }

    // Group-char: m:groupChr → \underbrace / \overbrace
    case 'groupChr': {
      const gPr   = getFirstChild(node, 'groupChrPr');
      const chrEl = gPr ? getFirstChild(gPr, 'chr') : null;
      const chrVal = chrEl ? getAttr(chrEl, 'val') : '⏟';
      const posEl  = gPr ? getFirstChild(gPr, 'pos') : null;
      const pos = posEl ? getAttr(posEl, 'val') : 'bot';
      const base = getFirstChild(node, 'e');
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      if (chrVal === '⏞' || pos === 'top') return `\\overbrace{${baseStr}}`;
      return `\\underbrace{${baseStr}}`;
    }

    // Pre-sub-sup: m:sPre
    case 'sPre': {
      const sub  = getFirstChild(node, 'sub');
      const sup  = getFirstChild(node, 'sup');
      const base = getFirstChild(node, 'e');
      const subStr  = sub  ? Array.from(sub.children).map(ommlNodeToLatex).join('') : '';
      const supStr  = sup  ? Array.from(sup.children).map(ommlNodeToLatex).join('') : '';
      const baseStr = base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
      return `{}_{${subStr}}^{${supStr}}${baseStr}`;
    }

    // Box: m:box → just contents
    case 'box': {
      const base = getFirstChild(node, 'e');
      return base ? `\\boxed{${Array.from(base.children).map(ommlNodeToLatex).join('')}}` : '';
    }

    // Phantom / smash
    case 'phant': {
      const base = getFirstChild(node, 'e');
      return base ? Array.from(base.children).map(ommlNodeToLatex).join('') : '';
    }

    // Properties containers — skip, process children
    case 'rPr':
    case 'fPr':
    case 'radPr':
    case 'naryPr':
    case 'dPr':
    case 'mPr':
    case 'accPr':
    case 'barPr':
    case 'groupChrPr':
    case 'sPrePr':
    case 'sSupPr':
    case 'sSubPr':
    case 'sSubSupPr':
    case 'funcPr':
    case 'eqArrPr':
    case 'borderBoxPr':
    case 'ctrlPr':
      return '';

    // Catch-all: recurse into children
    default: {
      return Array.from(node.children).map(ommlNodeToLatex).join('');
    }
  }
}

/**
 * Konversi seluruh dokumen XML string, temukan semua m:oMath,
 * kembalikan array LaTeX strings (satu per oMath).
 */
export function extractAllOmmlAsLatex(xmlString: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const mathEls = Array.from(doc.getElementsByTagNameNS(NS_M, 'oMath'));
  return mathEls.map(el => ommlNodeToLatex(el).trim());
}

/**
 * Patch XML string: ganti semua m:oMath dengan placeholder teks
 * yang bisa dilacak setelah mammoth memproses dokumen.
 * Returns: { patchedXml, latexMap }
 */
export function patchOmmlInXml(xmlString: string): {
  patchedXml: string;
  latexMap: Map<string, string>;
} {
  const latexMap = new Map<string, string>();
  let counter = 0;

  // Ganti setiap blok m:oMath dengan marker unik
  // Gunakan regex untuk menemukan blok oMath (termasuk namespace prefixed versions)
  const patchedXml = xmlString.replace(
    /<(?:m:)?oMath(?:\s[^>]*)?>[\s\S]*?<\/(?:m:)?oMath>/g,
    (match) => {
      const id = `MATH_${counter++}`;
      // Parse match dan konversi ke LaTeX
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<root xmlns:m="${NS_M}" xmlns:w="${NS_W}">${match}</root>`, 'application/xml');
        const mathEl = doc.getElementsByTagNameNS(NS_M, 'oMath')[0];
        if (mathEl) {
          const latex = ommlNodeToLatex(mathEl).trim();
          latexMap.set(id, latex || id);
        } else {
          latexMap.set(id, `[Rumus ${counter}]`);
        }
      } catch {
        latexMap.set(id, `[Rumus ${counter}]`);
      }
      // Replace dengan w:r yang berisi marker text
      return `<w:r xmlns:w="${NS_W}"><w:t xml:space="preserve"> ${id} </w:t></w:r>`;
    }
  );

  return { patchedXml, latexMap };
}
