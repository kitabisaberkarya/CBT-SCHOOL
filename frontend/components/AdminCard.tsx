
import React, { useRef, useState } from 'react';
import { User, AppConfig } from '../types';
import html2pdf from 'html2pdf.js';

interface AdminCardProps {
  adminUser: User;
  config: AppConfig;
}

// Ukuran kartu portrait: 54mm × 85.6mm (standar ID card portrait)
// Di layar ditampilkan 2.5× = 240px × 380px
const CARD_W_PX = 240;
const CARD_H_PX = 380;
const CARD_W_MM = 54;
const CARD_H_MM = 85.6;

const AdminCard: React.FC<AdminCardProps> = ({ adminUser, config }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const qrData = adminUser.qr_login_password
    ? `cbtauth::admin_pw::${adminUser.username}::${adminUser.qr_login_password}`
    : `cbtauth::admin::${adminUser.username}::${adminUser.id}`;

  // ECC=H: 30% error tolerance, tetap terbaca dengan logo di tengah
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&qzone=2&ecc=H&bgcolor=ffffff`;
  const displayUsername = adminUser.username.split('@')[0];
  const primaryColor = config.primaryColor || '#1e3a8a';

  /* ── Download PDF ─────────────────────────────────────────── */
  const handleDownloadPDF = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Ukuran PDF presisi = ukuran kartu DOM (tidak ada clipping)
      const opt = {
        margin:   0,
        filename: `kartu-admin-${displayUsername}.pdf`,
        image:    { type: 'jpeg', quality: 0.99 },
        html2canvas: {
          scale:        4,
          useCORS:      true,
          logging:      false,
          width:        CARD_W_PX,
          height:       CARD_H_PX,
          windowWidth:  CARD_W_PX,
          windowHeight: CARD_H_PX,
        },
        jsPDF: {
          unit:        'mm',
          format:      [CARD_W_MM, CARD_H_MM],  // 54mm × 85.6mm
          orientation: 'portrait' as const,
        },
      };
      await html2pdf().set(opt).from(cardRef.current).save();
    } catch (e) {
      console.error('PDF error:', e);
      alert('Gagal membuat PDF. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  /* ── Print via iframe ─────────────────────────────────────── */
  const handlePrint = () => {
    if (!cardRef.current) return;
    const content = cardRef.current.outerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    // Skala: konversi px card ke mm halaman cetak
    // 1mm = 96/25.4 = 3.7795px pada 96dpi
    // scale = (CARD_W_MM * 3.7795) / CARD_W_PX
    const printScale = (CARD_W_MM * 96) / (25.4 * CARD_W_PX);
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Kartu Admin — ${config.schoolName}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        @page{
          size:${CARD_W_MM}mm ${CARD_H_MM}mm;
          margin:0;
        }
        html,body{
          width:${CARD_W_MM}mm;
          height:${CARD_H_MM}mm;
          overflow:hidden;
          background:white;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
        }
        body>div{
          width:${CARD_W_PX}px !important;
          height:${CARD_H_PX}px !important;
          transform-origin:0 0;
          transform:scale(${printScale.toFixed(6)});
          overflow:hidden;
        }
      </style>
    </head><body>${content}</body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
    }, 700);
  };

  return (
    <div className="animate-fade-in w-full flex flex-col items-center pb-10">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 px-4 sm:px-8 mt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Cetak Kartu Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ID Card administrator — ukuran standar {CARD_W_MM}×{CARD_H_MM} mm (portrait)
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {isDownloading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            )}
            <span>{isDownloading ? 'Membuat PDF...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── Preview Area ─────────────────────────────────────────── */}
      <div className="w-full flex justify-center px-4">
        <div className="bg-slate-300 rounded-2xl p-8 sm:p-12 shadow-inner flex flex-col items-center gap-5">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
            Preview • {CARD_W_MM} × {CARD_H_MM} mm
          </p>

          {/* ═══════════════ KARTU (ref untuk PDF/Print) ═══════════════ */}
          <div
            ref={cardRef}
            style={{
              width:        `${CARD_W_PX}px`,
              height:       `${CARD_H_PX}px`,
              borderRadius: '14px',
              overflow:     'hidden',
              position:     'relative',
              fontFamily:   "'Inter', 'Segoe UI', sans-serif",
              flexShrink:   0,
              boxShadow:    '0 24px 64px rgba(0,0,0,0.45)',
              background:   `linear-gradient(160deg, #0f172a 0%, ${primaryColor} 60%, #1e1b4b 100%)`,
            }}
          >
            {/* ── Background: dot grid ── */}
            <div style={{
              position:'absolute', inset:0,
              backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)',
              backgroundSize:'14px 14px',
            }}/>

            {/* ── Decorative blobs ── */}
            <div style={{
              position:'absolute', top:'-50px', right:'-50px',
              width:'180px', height:'180px', borderRadius:'50%',
              background:'rgba(99,102,241,0.18)',
            }}/>
            <div style={{
              position:'absolute', bottom:'-40px', left:'-40px',
              width:'150px', height:'150px', borderRadius:'50%',
              background:'rgba(6,182,212,0.12)',
            }}/>

            {/* ── CONTENT ── */}
            <div style={{ position:'relative', zIndex:10, height:'100%', display:'flex', flexDirection:'column', alignItems:'center', padding:'18px 16px 0', paddingBottom:'0' }}>

              {/* 1. Header — logo + nama sekolah */}
              <div style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid rgba(255,255,255,0.15)', paddingBottom:'12px', marginBottom:'14px' }}>
                <div style={{ width:'36px', height:'36px', background:'white', borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'4px',
                  boxShadow:'0 2px 10px rgba(0,0,0,0.4)' }}>
                  <img src={config.logoUrl} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'white', fontWeight:800, fontSize:'9.5px', lineHeight:1.25,
                    textTransform:'uppercase', letterSpacing:'0.04em',
                    overflow:'hidden', display:'-webkit-box',
                    WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                    {config.schoolName}
                  </div>
                  <div style={{ color:'#67e8f9', fontSize:'7px', fontWeight:600, marginTop:'2px',
                    letterSpacing:'0.1em', textTransform:'uppercase' }}>
                    CBT School Enterprise
                  </div>
                </div>
              </div>

              {/* 2. Foto profil */}
              <div style={{ position:'relative', marginBottom:'10px' }}>
                {/* Gradient ring */}
                <div style={{ position:'absolute', inset:'-4px', borderRadius:'50%',
                  background:'linear-gradient(135deg,#67e8f9,#6366f1,#f472b6)', padding:'3px' }}/>
                <img
                  src={adminUser.photoUrl}
                  alt="Foto Admin"
                  style={{ position:'relative', width:'88px', height:'88px', borderRadius:'50%',
                    objectFit:'cover', border:'3px solid #0f172a', display:'block' }}
                />
              </div>

              {/* 3. Nama */}
              <div style={{ color:'white', fontWeight:900, fontSize:'13px', letterSpacing:'0.06em',
                textTransform:'uppercase', textAlign:'center', lineHeight:1.25, marginBottom:'6px',
                overflow:'hidden', display:'-webkit-box',
                WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                {adminUser.fullName}
              </div>

              {/* 4. Badge role */}
              <div style={{ display:'inline-block', background:'rgba(99,102,241,0.75)',
                color:'#e0e7ff', fontSize:'8px', fontWeight:700, padding:'3px 12px',
                borderRadius:'999px', letterSpacing:'0.12em', textTransform:'uppercase',
                marginBottom:'10px', border:'1px solid rgba(139,92,246,0.5)' }}>
                Administrator
              </div>

              {/* 5. Username */}
              <div style={{ color:'rgba(148,163,184,0.85)', fontSize:'8px', fontFamily:'monospace',
                letterSpacing:'0.06em', marginBottom:'12px' }}>
                @{displayUsername}
              </div>

              {/* 6. QR Code + logo di tengah */}
              <div style={{ position:'relative', background:'white', borderRadius:'12px',
                padding:'8px', boxShadow:'0 6px 24px rgba(0,0,0,0.5)',
                width:'100px', height:'100px',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img
                  src={qrUrl}
                  alt="QR Login"
                  crossOrigin="anonymous"
                  style={{ width:'84px', height:'84px', display:'block' }}
                />
                {/* Logo sekolah di tengah QR */}
                <div style={{
                  position:'absolute', top:'50%', left:'50%',
                  transform:'translate(-50%,-50%)',
                  width:'20px', height:'20px',
                  background:'white', borderRadius:'4px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'2px', boxShadow:'0 1px 6px rgba(0,0,0,0.3)',
                }}>
                  <img src={config.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
                </div>
              </div>

              {/* 7. Label scan */}
              <div style={{ color:'rgba(148,163,184,0.65)', fontSize:'6.5px', fontFamily:'monospace',
                textAlign:'center', lineHeight:1.5, marginTop:'6px', letterSpacing:'0.08em' }}>
                SCAN TO LOGIN • CBT SYSTEM
              </div>

              {/* ── Bottom gradient bar — di dalam flex agar tidak terpotong ── */}
              <div style={{
                marginTop:'auto',
                width:`${CARD_W_PX}px`,
                marginLeft:'-16px',
                marginRight:'-16px',
                height:'5px',
                flexShrink:0,
                background:`linear-gradient(90deg, #67e8f9 0%, ${primaryColor} 50%, #a78bfa 100%)`,
              }}/>

            </div>{/* end content */}
          </div>
          {/* ═══════════════ END KARTU ═══════════════ */}

          <p className="text-xs text-slate-500 text-center max-w-xs">
            QR berisi data login admin — scan dengan aplikasi CBT untuk masuk otomatis
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminCard;
