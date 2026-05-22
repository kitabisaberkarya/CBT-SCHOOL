
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, AppConfig } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExamCardsProps {
  users: User[];
  config: AppConfig;
}

const ExamCards: React.FC<ExamCardsProps> = ({ users, config }) => {
  const safeConfig = useMemo(() => ({
    defaultPaperSize: config?.defaultPaperSize || 'A4',
    primaryColor: config?.primaryColor || '#2563eb', 
    schoolName: config?.schoolName || 'NAMA SEKOLAH',
    logoUrl: config?.logoUrl || '',
    leftLogoUrl: config?.leftLogoUrl || '', // New
    headmasterName: config?.headmasterName || 'Kepala Sekolah',
    headmasterNip: config?.headmasterNip || '-',
    cardIssueDate: config?.cardIssueDate || 'Tempat, Tanggal',
    signatureUrl: config?.signatureUrl,
    stampUrl: config?.stampUrl,
    currentExamEvent: config?.currentExamEvent || 'KARTU PESERTA UJIAN',
    academicYear: config?.academicYear,
    kopHeader1: config?.kopHeader1 || 'PEMERINTAH PROVINSI',
    kopHeader2: config?.kopHeader2 || 'DINAS PENDIDIKAN'
  }), [config]);

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>(safeConfig.defaultPaperSize as 'A4' | 'F4' || 'A4');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(12); 

  const printRef = useRef<HTMLDivElement>(null);
  const pdfRenderRef = useRef<HTMLDivElement>(null);

  const studentUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.username !== 'admin@cbtschool.com' && (!u.role || u.role === 'student'));
  }, [users]);
  
  const classList = useMemo(() => ['all', ...Array.from(new Set(studentUsers.map(u => u.class))).sort()], [studentUsers]);

  const filteredUsers = useMemo(() => {
    return studentUsers.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchLower === '' ||
                            (user.fullName || '').toLowerCase().includes(searchLower) ||
                            (user.nisn || '').includes(searchLower);
      const matchesClass = classFilter === 'all' || user.class === classFilter;
      return matchesSearch && matchesClass;
    }).sort((a, b) => (a.class || '').localeCompare(b.class || '') || (a.fullName || '').localeCompare(b.fullName || ''));
  }, [studentUsers, searchTerm, classFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, classFilter, rowsPerPage]);

  const totalItems = filteredUsers.length;
  const totalPages = rowsPerPage === 0 ? 1 : Math.ceil(totalItems / rowsPerPage);
  
  const displayedUsers = useMemo(() => {
      if (rowsPerPage === 0) return filteredUsers;
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  const academicYear = useMemo(() => {
      // Use config first, fallback to calculation
      if (safeConfig.academicYear) return safeConfig.academicYear;
      
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      if (month > 5) return `${year}/${year + 1}`;
      return `${year - 1}/${year}`;
  }, [safeConfig.academicYear]);

  const renderCard = (user: User) => (
    <div key={user.id} className="page-break-inside-avoid card-item" style={{ width: '100%', height: '70mm', border: '1px solid #000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', backgroundColor: '#fff', margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: '0', right: '0', width: '40%', height: '8px', backgroundColor: '#1e3a8a' }}></div>
      <div style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '40%', backgroundColor: '#1e3a8a' }}></div>
      <div style={{ position: 'absolute', bottom: '0', left: '0', width: '40%', height: '8px', backgroundColor: '#dc2626' }}></div>
      <div style={{ position: 'absolute', bottom: '0', left: '0', width: '8px', height: '40%', backgroundColor: '#dc2626' }}></div>
      <div style={{ position: 'absolute', left: '0', top: '15%', bottom: '15%', width: '2px', backgroundColor: '#dc2626' }}></div>
      <div style={{ position: 'absolute', right: '0', top: '15%', bottom: '15%', width: '2px', backgroundColor: '#1e3a8a' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 6px 2px 6px', borderBottom: '1px solid #000', width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 2, backgroundColor: '#fff' }}>
        <div style={{ width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {safeConfig.leftLogoUrl && (<img src={safeConfig.leftLogoUrl} alt="Kab" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />)}
        </div>
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0, padding: '0 2px', overflow: 'hidden' }}>
          <div style={{ fontSize: '5.5px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeConfig.kopHeader1}</div>
          <div style={{ fontSize: '5.5px', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeConfig.kopHeader2}</div>
          <div style={{ fontSize: '6.5px', fontWeight: '900', textTransform: 'uppercase', color: '#000', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeConfig.schoolName}</div>
          <div style={{ fontSize: '5px', fontWeight: 'bold', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeConfig.currentExamEvent}</div>
        </div>
        <div style={{ width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {safeConfig.logoUrl ? (<img src={safeConfig.logoUrl} alt="Sekolah" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />) : (<div style={{fontSize:'6px', fontWeight:'bold'}}>LOGO</div>)}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px', marginBottom: '2px' }}>
        <div style={{ border: '2px solid black', padding: '2px', backgroundColor: 'white', width: '55px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=cbtauth::student::${user.nisn}::${user.password_text || user.nisn}&qzone=0`} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ color: '#1e3a8a', fontWeight: '900', fontSize: '9px', marginTop: '3px', textTransform: 'uppercase', maxWidth: '90%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{user.fullName}</div>
        <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '1px 6px', fontWeight: 'bold', fontSize: '7px', borderRadius: '2px', marginTop: '2px' }}>{user.class} | {user.nisn}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 12px 10px 12px', position: 'relative', zIndex: 3 }}>
        <div style={{ fontSize: '7px', fontWeight: '700', color: '#000', lineHeight: '1.3', zIndex: 3, position: 'relative' }}>
          <div>User : <span style={{fontFamily:'monospace'}}>{user.nisn}</span></div>
          <div>Pass : <span style={{fontFamily:'monospace'}}>{user.password_text || user.nisn}</span></div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '6px', width: '45%', position: 'relative', zIndex: 3 }}>
          <div style={{marginBottom: '2px'}}>{safeConfig.cardIssueDate}</div>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Kepala Sekolah,</div>
          <div style={{height: '36px', position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {safeConfig.stampUrl && (
              <img src={safeConfig.stampUrl} alt="Stamp" style={{ position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', objectFit: 'contain', opacity: 0.85, zIndex: 1 }} />
            )}
            {safeConfig.signatureUrl && (
              <img src={safeConfig.signatureUrl} alt="Sig" style={{ height: '32px', maxWidth: '100%', objectFit: 'contain', position: 'relative', zIndex: 2 }} />
            )}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '6px', textDecoration: 'underline', marginTop: '1px' }}>{safeConfig.headmasterName}</div>
          <div style={{ fontSize: '5px' }}>{safeConfig.headmasterNip}</div>
        </div>
      </div>
    </div>
  );

  const handleDownloadPDF = async () => {
    if (!pdfRenderRef.current) return;
    setIsProcessing(true);

    const sandbox = document.createElement('div');
    try {
      const PAGE_W_MM  = paperSize === 'A4' ? 210 : 215;
      const PAGE_H_MM  = paperSize === 'A4' ? 297 : 330;
      const PAD_MM     = 8;
      const CARD_H_MM  = 70;
      const GAP_MM     = 4;
      const SCALE      = 2;
      const PX_PER_MM  = 3.7795275591;
      const pageWPx    = Math.round(PAGE_W_MM * PX_PER_MM);
      const pageHPx    = Math.round(PAGE_H_MM * PX_PER_MM);

      // Smart row-boundary constants (canvas pixels after SCALE)
      const pxPerMM_c  = PX_PER_MM * SCALE;
      const topPadPx   = PAD_MM    * pxPerMM_c;  // top padding of content
      const cardHPx    = CARD_H_MM * pxPerMM_c;  // card height in canvas px
      const gapPx      = GAP_MM    * pxPerMM_c;  // gap between rows
      const rowPitchPx = cardHPx + gapPx;         // distance from one row start to next

      // Clone the hidden PDF render target (always has ALL filteredUsers)
      const content = pdfRenderRef.current.cloneNode(true) as HTMLElement;
      content.style.cssText = `width:${pageWPx}px;padding:${PAD_MM}mm;margin:0;box-sizing:border-box;background:#fff;font-family:sans-serif;`;

      // Allow overflow so footer text is never clipped by card height constraint
      content.querySelectorAll<HTMLElement>('.card-item').forEach(card => {
        card.style.overflow = 'visible';
      });

      sandbox.style.cssText = `position:fixed;top:-99999px;left:0;width:${pageWPx}px;background:#fff;overflow:visible;`;
      sandbox.appendChild(content);
      document.body.appendChild(sandbox);

      await Promise.all(
        Array.from(sandbox.querySelectorAll('img')).map(img =>
          img.complete && img.naturalHeight !== 0
            ? Promise.resolve()
            : new Promise(res => { img.onload = res; img.onerror = res; })
        )
      );
      await new Promise(res => setTimeout(res, 500));

      const fullCanvas = await html2canvas(content, {
        scale: SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: pageWPx,
        windowWidth: pageWPx,
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });

      const totalHPx    = fullCanvas.height;
      const pageHScaled = pageHPx * SCALE;

      // Build page slices cutting ONLY between card rows (never through a row)
      // cutAfterRow[n] = topPadPx + n * rowPitchPx + cardHPx (right after row n ends)
      const pages: Array<{ startY: number; endY: number }> = [];
      let startY = 0;
      while (startY < totalHPx) {
        const idealEnd = startY + pageHScaled;
        if (idealEnd >= totalHPx) {
          pages.push({ startY, endY: totalHPx });
          break;
        }
        // Max row index whose bottom edge fits within idealEnd
        const maxN = Math.floor((idealEnd - topPadPx - cardHPx) / rowPitchPx);
        const cutY = maxN >= 0
          ? Math.max(startY + 1, topPadPx + maxN * rowPitchPx + cardHPx)
          : idealEnd;
        pages.push({ startY, endY: cutY });
        startY = cutY;
      }

      const pdf = new jsPDF({
        unit: 'mm',
        format: paperSize === 'A4' ? 'a4' : [PAGE_W_MM, PAGE_H_MM],
        orientation: 'portrait',
        compress: true,
      });

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const { startY: pY, endY: pEnd } = pages[i];
        const srcH    = pEnd - pY;
        const destHMM = srcH / SCALE / PX_PER_MM;

        const pageCanvas  = document.createElement('canvas');
        pageCanvas.width  = fullCanvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, srcH);
        ctx.drawImage(fullCanvas, 0, pY, fullCanvas.width, srcH, 0, 0, fullCanvas.width, srcH);

        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PAGE_W_MM, destHMM);
      }

      const label = classFilter === 'all' ? 'Semua' : classFilter.replace(/\s+/g, '_');
      pdf.save(`Kartu_Ujian_${label}_${new Date().toISOString().slice(0, 10)}.pdf`);

    } catch (err) {
      console.error('PDF Fail:', err);
      alert('Gagal membuat PDF. Gunakan fitur Print Browser sebagai alternatif.');
    } finally {
      if (sandbox.parentNode) document.body.removeChild(sandbox);
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
      if (!printRef.current) return;

      const printContents = printRef.current.innerHTML;
      const root = document.getElementById('root');

      // Inline print style injected to ensure grid/card layout prints correctly
      const printStyle = document.createElement('style');
      printStyle.id = 'exam-cards-print-style';
      printStyle.innerHTML = `
        @media print {
          body > *:not(#exam-cards-print-container) { display: none !important; }
          #exam-cards-print-container {
            display: block !important;
            width: 100%;
            margin: 0;
            padding: 5mm;
            box-sizing: border-box;
          }
          .grid-layout-target {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4mm !important;
            width: 100% !important;
          }
          .card-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #000 !important;
          }
        }
      `;
      document.head.appendChild(printStyle);

      const printContainer = document.createElement('div');
      printContainer.id = 'exam-cards-print-container';
      printContainer.innerHTML = printContents;
      document.body.appendChild(printContainer);

      // Clean up AFTER print dialog closes (afterprint event)
      const cleanup = () => {
        if (document.getElementById('exam-cards-print-container')) {
          document.body.removeChild(printContainer);
        }
        const existingStyle = document.getElementById('exam-cards-print-style');
        if (existingStyle) document.head.removeChild(existingStyle);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);

      window.print();
  }

  return (
    <div className="animate-fade-in flex flex-col h-full bg-slate-100 relative">
      
      {isProcessing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-bold text-slate-700">Menyusun Kartu Ujian...</h3>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                    Cetak Kartu Ujian (12/Page)
                </h1>
                <p className="text-sm text-slate-500 mt-1">Total Siswa Terfilter: <span className="font-bold text-blue-600">{totalItems}</span></p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase px-3">Kertas:</label>
                    <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as 'A4' | 'F4')} className="bg-white text-sm font-semibold text-slate-700 py-1.5 px-3 rounded-md border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                        <option value="A4">A4</option>
                        <option value="F4">F4</option>
                    </select>
                </div>
                <button onClick={handleDownloadPDF} disabled={filteredUsers.length === 0 || isProcessing} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-all disabled:opacity-50"><span>PDF</span></button>
                <button onClick={handlePrint} disabled={displayedUsers.length === 0} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-50 transition-all shadow-sm"><span>Print</span></button>
            </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-auto flex-grow relative">
                <input type="text" placeholder="Cari Nama / NISN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="w-full md:w-64">
                 <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Semua Kelas</option>
                    {classList.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 font-medium">Tampilkan:</span>
                <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="p-1.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 bg-white">
                    <option value={12}>12 Kartu</option>
                    <option value={6}>6 Kartu</option>
                    <option value={0}>Semua</option>
                </select>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50">&lt;</button>
                <span className="text-sm text-gray-600">Page <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) handlePageChange(val); }} className="w-12 p-1.5 text-center font-bold border border-gray-300 rounded-md" /> of <b>{totalPages}</b></span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50">&gt;</button>
            </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-slate-200 p-4 md:p-6">
        <div className="bg-white shadow-2xl mx-auto" style={{ width: paperSize === 'A4' ? '210mm' : '215mm', minHeight: paperSize === 'A4' ? '297mm' : '330mm', padding: '5mm', boxSizing: 'border-box' }}>
            <div id="print-content" ref={printRef} className="print-container" style={{ width: '100%' }}>
                {displayedUsers.length > 0 ? (
                    <div className="grid-layout-target" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4mm', width: '100%', boxSizing: 'border-box' }}>
                        {displayedUsers.map((user) => renderCard(user))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <p className="font-medium">Tidak ada data siswa ditemukan.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
      {/* Hidden PDF render target — always renders ALL filteredUsers for PDF export */}
      <div
        ref={pdfRenderRef}
        aria-hidden="true"
        style={{ position: 'fixed', left: '-99999px', top: 0, width: paperSize === 'A4' ? '794px' : '813px', padding: '8mm', margin: 0, boxSizing: 'border-box', background: '#fff', fontFamily: 'sans-serif', pointerEvents: 'none' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4mm', width: '100%', boxSizing: 'border-box' }}>
          {filteredUsers.map((user) => renderCard(user))}
        </div>
      </div>

      <style>{`@media print { .grid-layout-target { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 4mm !important; page-break-inside: auto; } .card-item { break-inside: avoid; page-break-inside: avoid; margin-bottom: 0 !important; border: 1px solid black !important; } }`}</style>
    </div>
  );
};

export default ExamCards;
