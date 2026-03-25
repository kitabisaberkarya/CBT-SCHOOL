import React from 'react';
import { Download, FileArchive, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NetworkGuide from './NetworkGuide';

const Downloads: React.FC = () => {
  const { language } = useLanguage();

  const downloadUrl = "https://drive.google.com/uc?export=download&id=14fZo2mBOO9j1kzxq31R4Xxl3QelomSVD";

  const content = {
    id: {
      title: "Download Resource",
      subtitle: "CBT SCHOOL V409_250326.rar",
      desc: "Unduh file Virtual Machine (VHD/VDI) untuk simulasi mandiri atau instalasi server lokal. File ini sudah terkonfigurasi dengan sistem CBT School terbaru.",
      btn: "Download Sekarang",
      size: "Ukuran File: 7,7 GB",
      version: "Versi: 4.0.9 (Stable)",
      note: "Catatan: Karena ukuran file besar, klik 'Tetap download' pada halaman Google Drive.",
      features: [
        "Siap pakai (Pre-configured)",
        "Mendukung VirtualBox & VMware",
        "Optimasi Database PostgreSQL",
        "Keamanan Terjamin"
      ]
    },
    en: {
      title: "Download Resource",
      subtitle: "CBT SCHOOL V409_250326.rar",
      desc: "Download the Virtual Machine (VHD/VDI) file for standalone simulation or local server installation. This file is pre-configured with the latest CBT School system.",
      btn: "Download Now",
      size: "File Size: 7.7 GB",
      version: "Version: 4.0.9 (Stable)",
      note: "Note: Due to large size, click 'Download anyway' on the Google Drive page.",
      features: [
        "Ready to use (Pre-configured)",
        "Supports VirtualBox & VMware",
        "PostgreSQL Database Optimization",
        "Guaranteed Security"
      ]
    }
  };

  const c = language === 'id' ? content.id : content.en;

  return (
    <section id="downloads" className="py-20 relative bg-slate-50 dark:bg-dark transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {c.title} <span className="text-gradient">CBT SCHOOL</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {c.desc}
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-16" data-aos="zoom-in">
          <div className="glass-card rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col md:flex-row shadow-2xl shadow-blue-500/5">
            {/* Left Side: Info */}
            <div className="p-8 md:p-12 flex-grow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-secondary/10 rounded-2xl">
                  <HardDrive className="text-secondary w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{c.subtitle}</h3>
                  <p className="text-secondary font-medium text-sm">{c.version}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {c.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <a 
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-secondary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5 group-hover:bounce" />
                    {c.btn}
                  </a>
                  <div className="text-slate-400 text-sm italic">
                    {c.size}
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  * {c.note}
                </p>
              </div>
            </div>

            {/* Right Side: Visual/Icon */}
            <div className="bg-slate-100 dark:bg-white/5 p-12 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary/20 blur-3xl rounded-full"></div>
                <FileArchive className="w-32 h-32 text-slate-300 dark:text-slate-700 relative z-10" />
                <div className="absolute -bottom-2 -right-2 bg-secondary p-3 rounded-xl shadow-lg animate-bounce">
                  <Zap className="text-white w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tutorial Section - Network Configuration */}
        <div id="network-guide" className="mt-12">
          <NetworkGuide />
        </div>
      </div>
    </section>
  );
};


export default Downloads;
