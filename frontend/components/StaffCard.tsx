import React, { useRef, useState } from 'react';
import { User, AppConfig } from '../types';
import html2pdf from 'html2pdf.js';
import { supabase } from '../supabaseClient';

interface StaffCardProps {
  staffUsers: User[];
  config: AppConfig;
  role: 'teacher' | 'pengawas';
}

const CARD_W_PX = 240;
const CARD_H_PX = 380;
const CARD_W_MM = 54;
const CARD_H_MM = 85.6;

const ROLE_CONFIG = {
  teacher: {
    label: 'GURU',
    labelFull: 'Guru',
    badgeColor: 'rgba(5,150,105,0.75)',
    badgeBorder: 'rgba(6,182,212,0.5)',
    badgeText: '#d1fae5',
    gradient: 'linear-gradient(160deg, #064e3b 0%, #059669 60%, #065f46 100%)',
    accentColor: '#6ee7b7',
    blob1: 'rgba(16,185,129,0.18)',
    blob2: 'rgba(6,182,212,0.12)',
    barGradient: 'linear-gradient(90deg, #6ee7b7 0%, #059669 50%, #0891b2 100%)',
    filePrefix: 'kartu-guru',
    title: 'Cetak Kartu Guru',
    desc: 'ID Card guru — ukuran standar 54×85.6 mm (portrait)',
    qrLabel: 'SCAN TO LOGIN • GURU CBT',
    subInfo: (u: User) => u.class || u.major || u.username,
  },
  pengawas: {
    label: 'PENGAWAS UJIAN',
    labelFull: 'Pengawas',
    badgeColor: 'rgba(180,83,9,0.75)',
    badgeBorder: 'rgba(251,191,36,0.5)',
    badgeText: '#fef3c7',
    gradient: 'linear-gradient(160deg, #431407 0%, #c2410c 60%, #7c2d12 100%)',
    accentColor: '#fcd34d',
    blob1: 'rgba(234,88,12,0.18)',
    blob2: 'rgba(251,191,36,0.12)',
    barGradient: 'linear-gradient(90deg, #fcd34d 0%, #c2410c 50%, #f59e0b 100%)',
    filePrefix: 'kartu-pengawas',
    title: 'Cetak Kartu Pengawas',
    desc: 'ID Card pengawas ujian — ukuran standar 54×85.6 mm (portrait)',
    qrLabel: 'SCAN TO LOGIN • PENGAWAS CBT',
    subInfo: (u: User) => u.class || u.username,
  },
};

interface SingleCardProps {
  staffUser: User;
  config: AppConfig;
  rc: typeof ROLE_CONFIG['teacher'];
  cardRef: (el: HTMLDivElement | null) => void;
}

const SingleCard: React.FC<SingleCardProps> = ({ staffUser, config, rc, cardRef }) => {
  const primaryColor = config.primaryColor || '#1e3a8a';
  const displayName = staffUser.fullName || staffUser.username;
  const displayId = staffUser.username;
  const qrPassword = staffUser.password_text || staffUser.qr_login_password;
  const qrData = qrPassword
    ? `cbtauth::admin_pw::${staffUser.username}::${qrPassword}`
    : null;
  const qrUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&qzone=2&ecc=H&bgcolor=ffffff`
    : null;
  const subInfo = rc.subInfo(staffUser);

  return (
    <div
      ref={cardRef}
      style={{
        width: `${CARD_W_PX}px`,
        height: `${CARD_H_PX}px`,
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        flexShrink: 0,
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        background: rc.gradient,
      }}
    >
      {/* dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      {/* blobs */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px', borderRadius: '50%', background: rc.blob1 }} />
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: rc.blob2 }} />

      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 16px 0' }}>
        {/* Header */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '14px' }}>
          <div style={{ width: '36px', height: '36px', background: 'white', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            <img src={config.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: '9.5px', lineHeight: 1.25, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {config.schoolName}
            </div>
            <div style={{ color: rc.accentColor, fontSize: '7px', fontWeight: 600, marginTop: '2px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              CBT School Enterprise
            </div>
          </div>
        </div>

        {/* Foto */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', background: `linear-gradient(135deg,${rc.accentColor},#6366f1,#f472b6)`, padding: '3px' }} />
          <img
            src={staffUser.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=200&background=random&color=fff`}
            alt={displayName}
            style={{ position: 'relative', width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(0,0,0,0.3)', display: 'block' }}
          />
        </div>

        {/* Nama */}
        <div style={{ color: 'white', fontWeight: 900, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.25, marginBottom: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {displayName}
        </div>

        {/* Badge role */}
        <div style={{ display: 'inline-block', background: rc.badgeColor, color: rc.badgeText, fontSize: '8px', fontWeight: 700, padding: '3px 12px', borderRadius: '999px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px', border: `1px solid ${rc.badgeBorder}` }}>
          {rc.label}
        </div>

        {/* Sub info (mapel / ruangan) */}
        {subInfo && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '8px', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.04em' }}>
            {subInfo}
          </div>
        )}

        {/* Username/ID */}
        <div style={{ color: 'rgba(148,163,184,0.75)', fontSize: '7.5px', fontFamily: 'monospace', letterSpacing: '0.06em', marginBottom: '10px' }}>
          @{displayId}
        </div>

        {/* QR Code */}
        {qrUrl ? (
          <>
            <div style={{ position: 'relative', background: 'white', borderRadius: '12px', padding: '8px', boxShadow: '0 6px 24px rgba(0,0,0,0.5)', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={qrUrl} alt="QR Login" crossOrigin="anonymous" style={{ width: '84px', height: '84px', display: 'block' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '20px', height: '20px', background: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', boxShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
                <img src={config.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            </div>
            <div style={{ color: 'rgba(148,163,184,0.65)', fontSize: '6.5px', fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.5, marginTop: '6px', letterSpacing: '0.08em' }}>
              {rc.qrLabel}
            </div>
          </>
        ) : (
          <div style={{ width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', textAlign: 'center', padding: '8px' }}>QR tidak tersedia<br/>Set password akun</div>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ marginTop: 'auto', width: `${CARD_W_PX}px`, marginLeft: '-16px', marginRight: '-16px', height: '5px', flexShrink: 0, background: rc.barGradient }} />
      </div>
    </div>
  );
};

const generateToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const StaffCard: React.FC<StaffCardProps> = ({ staffUsers, config, role }) => {
  const rc = ROLE_CONFIG[role];
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [localUsers, setLocalUsers] = useState<User[]>(staffUsers);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const generateQRForUser = async (idx: number) => {
    const user = localUsers[idx];
    if (generatingIdx !== null) return;
    setGeneratingIdx(idx);
    try {
      const token = generateToken();
      const { error } = await supabase.from('users').update({ qr_login_password: token }).eq('id', user.id);
      if (error) throw error;
      setLocalUsers(prev => prev.map((u, i) => i === idx ? { ...u, qr_login_password: token } : u));
    } catch {
      alert('Gagal menyimpan QR password. Coba lagi.');
    } finally {
      setGeneratingIdx(null);
    }
  };

  const generateAllQR = async () => {
    if (isGeneratingAll) return;
    const needQR = localUsers.filter(u => !u.password_text && !u.qr_login_password);
    if (needQR.length === 0) { alert('Semua kartu sudah memiliki QR.'); return; }
    setIsGeneratingAll(true);
    try {
      const updates = needQR.map(u => ({ id: u.id, token: generateToken() }));
      for (const { id, token } of updates) {
        await supabase.from('users').update({ qr_login_password: token }).eq('id', id);
      }
      setLocalUsers(prev => prev.map(u => {
        const upd = updates.find(x => x.id === u.id);
        return upd ? { ...u, qr_login_password: upd.token } : u;
      }));
    } catch {
      alert('Gagal generate QR untuk sebagian akun. Coba lagi.');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const downloadPDF = async (idx: number) => {
    const el = cardRefs.current[idx];
    if (!el || downloadingIdx !== null) return;
    setDownloadingIdx(idx);
    const user = localUsers[idx];
    try {
      const opt = {
        margin: 0,
        filename: `${rc.filePrefix}-${user.username}.pdf`,
        image: { type: 'jpeg', quality: 0.99 },
        html2canvas: { scale: 4, useCORS: true, logging: false, width: CARD_W_PX, height: CARD_H_PX, windowWidth: CARD_W_PX, windowHeight: CARD_H_PX },
        jsPDF: { unit: 'mm', format: [CARD_W_MM, CARD_H_MM], orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(el).save();
    } catch { alert('Gagal membuat PDF.'); }
    finally { setDownloadingIdx(null); }
  };

  const printCard = (idx: number) => {
    const el = cardRefs.current[idx];
    if (!el) return;
    const content = el.outerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const printScale = (CARD_W_MM * 96) / (25.4 * CARD_W_PX);
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box;margin:0;padding:0;}@page{size:${CARD_W_MM}mm ${CARD_H_MM}mm;margin:0;}html,body{width:${CARD_W_MM}mm;height:${CARD_H_MM}mm;overflow:hidden;background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body>div{width:${CARD_W_PX}px!important;height:${CARD_H_PX}px!important;transform-origin:0 0;transform:scale(${printScale.toFixed(6)});overflow:hidden;}</style></head><body>${content}</body></html>`);
    doc.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000); }, 700);
  };

  const bulkDownloadAll = async () => {
    if (isBulkDownloading) return;
    setIsBulkDownloading(true);
    for (let i = 0; i < localUsers.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const user = localUsers[i];
      try {
        const opt = {
          margin: 0,
          filename: `${rc.filePrefix}-${user.username}.pdf`,
          image: { type: 'jpeg', quality: 0.99 },
          html2canvas: { scale: 4, useCORS: true, logging: false, width: CARD_W_PX, height: CARD_H_PX, windowWidth: CARD_W_PX, windowHeight: CARD_H_PX },
          jsPDF: { unit: 'mm', format: [CARD_W_MM, CARD_H_MM], orientation: 'portrait' as const },
        };
        await html2pdf().set(opt).from(el).save();
        await new Promise(r => setTimeout(r, 400));
      } catch { /* lanjut */ }
    }
    setIsBulkDownloading(false);
  };

  if (staffUsers.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="font-semibold text-lg">Belum ada data {rc.labelFull}</p>
        <p className="text-sm mt-1">Tambahkan akun {rc.labelFull} terlebih dahulu di menu Manajemen User.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full flex flex-col items-center pb-10">
      {/* Toolbar */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 px-4 sm:px-8 mt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{rc.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rc.desc} • {staffUsers.length} {rc.labelFull}</p>
        </div>
        <button
          onClick={bulkDownloadAll}
          disabled={isBulkDownloading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          {isBulkDownloading ? (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          )}
          <span>{isBulkDownloading ? 'Membuat PDF...' : `Download Semua (${localUsers.length})`}</span>
        </button>
        {localUsers.some(u => !u.password_text && !u.qr_login_password) && (
          <button
            onClick={generateAllQR}
            disabled={isGeneratingAll}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {isGeneratingAll ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            )}
            <span>{isGeneratingAll ? 'Membuat QR...' : 'Buat QR untuk Semua'}</span>
          </button>
        )}
      </div>

      {/* Grid kartu */}
      <div className="w-full px-4 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
          {localUsers.map((u, idx) => {
            const hasQR = !!(u.password_text || u.qr_login_password);
            return (
            <div key={u.id} className="flex flex-col items-center gap-3">
              {/* Preview kartu */}
              <div className="bg-slate-300 rounded-2xl p-6 shadow-inner flex flex-col items-center">
                <SingleCard
                  staffUser={u}
                  config={config}
                  rc={rc}
                  cardRef={(el: HTMLDivElement | null) => { cardRefs.current[idx] = el; }}
                />
              </div>

              {/* Action buttons per kartu */}
              <div className="flex gap-2 flex-wrap justify-center">
                {!hasQR && (
                  <button
                    onClick={() => generateQRForUser(idx)}
                    disabled={generatingIdx !== null}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition-all"
                  >
                    {generatingIdx === idx ? (
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                    )}
                    Buat QR
                  </button>
                )}
                <button
                  onClick={() => downloadPDF(idx)}
                  disabled={downloadingIdx !== null}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition-all"
                >
                  {downloadingIdx === idx ? (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  )}
                  PDF
                </button>
                <button
                  onClick={() => printCard(idx)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Print
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center font-medium">{u.fullName || u.username}</p>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
