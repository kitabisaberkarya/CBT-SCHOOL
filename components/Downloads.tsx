import React from 'react';
import { Download, FileArchive, HardDrive, ShieldCheck, Zap, FileSpreadsheet, ExternalLink, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import NetworkGuide from './NetworkGuide';

const Downloads: React.FC = () => {
  const { language } = useLanguage();

  const downloadUrl = "https://drive.google.com/file/d/1gLG4g_LSGI8ZxOyAgB4qJGgdWLEQQJ0d/view?usp=sharing";
  const templateSheetUrl = "https://docs.google.com/spreadsheets/d/1TX4pu1sehACBj696DTTtrrZ7owC1o_w99PQl1rfESUY/edit?usp=sharing";
  const templateCsvUrl = "https://docs.google.com/spreadsheets/d/1TX4pu1sehACBj696DTTtrrZ7owC1o_w99PQl1rfESUY/export?format=csv";

  const content = {
    id: {
      title: "Download Resource",
      subtitle: "CBT SCHOOL V411_280326.rar",
      desc: "Unduh file Virtual Machine (VHD/VDI) untuk simulasi mandiri atau instalasi server lokal. File ini sudah terkonfigurasi dengan sistem CBT School terbaru.",
      btn: "Download Sekarang",
      size: "Ukuran File: 7,7 GB",
      version: "Versi: 4.1.1 (Stable)",
      note: "Catatan: Karena ukuran file besar, klik 'Tetap download' pada halaman Google Drive.",
      demoNote: "Bagi sekolah, instansi, dan lembaga yang ingin mencoba semua fitur, silakan masukkan lisensi demo: CBT-SCHOOL-DEMO",
      features: [
        "Siap pakai (Pre-configured)",
        "Mendukung VirtualBox & VMware",
        "Optimasi Database PostgreSQL",
        "Keamanan Terjamin"
      ],
      template: {
        title: "Template Import Data",
        desc: "Gunakan template spreadsheet ini untuk mengimpor data siswa, guru, dan mata pelajaran secara massal ke sistem CBT School.",
        btnCopy: "Buka & Salin Template",
        btnCsv: "Download Format CSV",
      }
    },
    en: {
      title: "Download Resource",
      subtitle: "CBT SCHOOL V411_280326.rar",
      desc: "Download the Virtual Machine (VHD/VDI) file for standalone simulation or local server installation. This file is pre-configured with the latest CBT School system.",
      btn: "Download Now",
      size: "File Size: 7.7 GB",
      version: "Version: 4.1.1 (Stable)",
      note: "Note: Due to large size, click 'Download anyway' on the Google Drive page.",
      demoNote: "For schools, institutions, and agencies that want to try all features, please use the demo license: CBT-SCHOOL-DEMO",
      features: [
        "Ready to use (Pre-configured)",
        "Supports VirtualBox & VMware",
        "PostgreSQL Database Optimization",
        "Guaranteed Security"
      ],
      template: {
        title: "Data Import Template",
        desc: "Use this spreadsheet template to bulk import student, teacher, and subject data into the CBT School system.",
        btnCopy: "Open & Copy Template",
        btnCsv: "Download CSV Format",
      }
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

        {/* Main VM Download Card */}
        <div className="max-w-4xl mx-auto mb-10" data-aos="zoom-in">
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
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    * {c.note}
                  </p>
                  <p className="text-xs font-bold text-secondary dark:text-blue-400">
                    * {c.demoNote}
                  </p>
                </div>
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

        {/* Spreadsheet Template Card */}
        <div className="max-w-4xl mx-auto mb-16" data-aos="fade-up">
          <div className="glass-card rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-white/10 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{c.template.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {c.template.desc}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <a 
                    href={templateSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-500/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {c.template.btnCopy}
                  </a>
                  <a 
                    href={templateCsvUrl}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-900/20"
                  >
                    <FileText className="w-4 h-4" />
                    {c.template.btnCsv}
                  </a>
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
