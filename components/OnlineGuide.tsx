import React from 'react';
import { 
  Globe, Zap, ShieldCheck, ArrowRight, Monitor, Cloud, Lock, 
  CheckCircle2, Server, Banknote, HelpCircle, AlertTriangle, 
  Info, ExternalLink, Copy, Check, ChevronRight, ListChecks
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const OnlineGuide: React.FC = () => {
  const { language } = useLanguage();

  const isID = language === 'id';

  return (
    <section id="online-guide" className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BAGIAN 1 — PENDAHULUAN & GAMBARAN SISTEM */}
        <div className="relative p-8 md:p-16 rounded-[3rem] bg-slate-900 overflow-hidden mb-20 shadow-2xl border border-slate-800" data-aos="fade-up">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]"></div>
          
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/30 mb-8">
              <Globe size={14} /> {isID ? 'Pusat Edukasi Infrastruktur' : 'Infrastructure Education Center'}
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1]">
              {isID ? 'Cara Mengonlinekan' : 'How to Online'} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                VHD CBT SCHOOL
              </span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-12 mt-12">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Zap className="text-yellow-400" /> {isID ? 'Apa yang Akan Dicapai' : 'What Will Be Achieved'}
                </h3>
                <ul className="space-y-4 text-slate-400">
                  <li className="flex gap-3">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-1" />
                    <span>{isID ? 'Aplikasi CBT School bisa diakses siswa dari mana saja via internet' : 'CBT School app accessible by students from anywhere via internet'}</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-1" />
                    <span>{isID ? 'Tanpa port forwarding, tanpa IP publik, tanpa konfigurasi router' : 'No port forwarding, no public IP, no router configuration'}</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-1" />
                    <span>{isID ? 'Cukup dengan Token dari Cloudflare → paste di panel → klik aktifkan' : 'Simply with Cloudflare Token → paste in panel → click activate'}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">{isID ? 'Arsitektur Sederhana' : 'Simple Architecture'}</h3>
                <div className="space-y-4 font-mono text-xs md:text-sm">
                  <div className="flex items-center gap-3 text-blue-400">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">1</div>
                    <span>ADMIN Dashboard → Copy Token</span>
                  </div>
                  <div className="ml-4 h-6 border-l border-slate-700"></div>
                  <div className="flex items-center gap-3 text-cyan-400">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">2</div>
                    <span>Panel CBT VHD → Paste Token</span>
                  </div>
                  <div className="ml-4 h-6 border-l border-slate-700"></div>
                  <div className="flex items-center gap-3 text-green-400">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">3</div>
                    <span>Tunnel Aktif → URL Publik Muncul</span>
                  </div>
                  <div className="ml-4 h-6 border-l border-slate-700"></div>
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">4</div>
                    <span>Siswa Akses via URL Publik</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 1.3 — DUA MODE OPERASIONAL */}
        <div className="mb-20" data-aos="fade-up">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <Server className="text-blue-600" /> {isID ? 'Dua Mode Operasional Panel CBT' : 'Two Operational Modes of CBT Panel'}
          </h3>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="p-6 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">Mode</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">{isID ? 'Cara Aktifkan' : 'How to Activate'}</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">{isID ? 'Kebutuhan' : 'Requirements'}</th>
                  <th className="p-6 font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">URL Akses Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-yellow-500" />
                      <span className="font-bold text-slate-900 dark:text-white">Quick Tunnel</span>
                    </div>
                  </td>
                  <td className="p-6 text-slate-600 dark:text-slate-400">{isID ? 'Klik Aktifkan (tanpa token)' : 'Click Activate (no token)'}</td>
                  <td className="p-6 text-slate-600 dark:text-slate-400">{isID ? 'Internet di server' : 'Internet on server'}</td>
                  <td className="p-6 font-mono text-xs text-blue-600 dark:text-blue-400">*.trycloudflare.com</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-blue-500" />
                      <span className="font-bold text-slate-900 dark:text-white">Named Tunnel</span>
                    </div>
                  </td>
                  <td className="p-6 text-slate-600 dark:text-slate-400">{isID ? 'Paste token → Aktifkan' : 'Paste token → Activate'}</td>
                  <td className="p-6 text-slate-600 dark:text-slate-400">{isID ? 'Akun Cloudflare + Domain' : 'Cloudflare Account + Domain'}</td>
                  <td className="p-6 font-mono text-xs text-green-600 dark:text-green-400">cbt.sekolahanda.sch.id</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Kapan Menggunakan Quick Tunnel?</h4>
              <p className="text-sm text-blue-800/70 dark:text-blue-200/60">Ujian mendadak, tidak punya domain, atau sekadar ingin mencoba fitur online pertama kali.</p>
            </div>
            <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
              <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">Kapan Menggunakan Named Tunnel?</h4>
              <p className="text-sm text-green-800/70 dark:text-green-200/60">Ujian rutin resmi, membutuhkan URL tetap yang profesional menggunakan domain sekolah.</p>
            </div>
          </div>
        </div>

        {/* BAGIAN 2 — PERSIAPAN AKUN CLOUDFLARE */}
        <div className="mb-20" data-aos="fade-up">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" /> {isID ? 'BAGIAN 2 — Persiapan Akun Cloudflare' : 'SECTION 2 — Cloudflare Account Preparation'}
          </h3>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">2A. Membuat Akun Cloudflare</h4>
                <ol className="space-y-4 text-slate-600 dark:text-slate-400">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    <span>Buka <a href="https://dash.cloudflare.com/sign-up" target="_blank" className="text-blue-600 underline">dash.cloudflare.com/sign-up</a></span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                    <span>Isi email dan password, lalu verifikasi email Anda.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                    <span>Pilih plan <strong>Free</strong> (sudah sangat cukup untuk kebutuhan sekolah).</span>
                  </li>
                </ol>
              </div>

              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">2B. Mendaftarkan Domain ke Cloudflare</h4>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Skenario 1 — Sudah punya domain</h5>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li>• Klik <strong>"Add a domain"</strong> di dashboard.</li>
                      <li>• Masukkan nama domain sekolah.</li>
                      <li>• Ikuti instruksi ubah nameserver di registrar.</li>
                      <li>• Tunggu propagasi DNS (15 menit - 24 jam).</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Skenario 2 — Belum punya domain</h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Rekomendasi domain:</p>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li>• <strong>.sch.id</strong> (Khusus sekolah, resmi)</li>
                      <li>• <strong>.my.id</strong> (Murah ±Rp 15rb/tahun)</li>
                      <li>• <strong>.com</strong> (Universal)</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 flex gap-4">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>PERINGATAN:</strong> Tanpa domain yang terdaftar di Cloudflare, Named Tunnel tidak bisa digunakan. Gunakan Quick Tunnel sebagai alternatif sementara.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
                <h4 className="text-lg font-bold mb-4">2C. Cloudflare Zero Trust</h4>
                <p className="text-sm text-blue-100 mb-6 leading-relaxed">
                  Akses dashboard khusus untuk manajemen tunnel di:
                  <br />
                  <a href="https://one.dash.cloudflare.com/" target="_blank" className="font-mono bg-white/10 px-2 py-1 rounded mt-2 inline-block">one.dash.cloudflare.com</a>
                </p>
                <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                  <p className="text-xs italic">
                    "Zero Trust Dashboard adalah panel khusus untuk menghubungkan server lokal (VHD) ke internet secara aman."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 3 — MENDAPATKAN TOKEN NAMED TUNNEL */}
        <div className="mb-20" data-aos="fade-up">
          <div className="p-1 rounded-[3rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600">
            <div className="bg-white dark:bg-slate-900 rounded-[2.9rem] p-8 md:p-16">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                  <Lock size={28} />
                </div>
                {isID ? 'BAGIAN 3 — Mendapatkan Token Named Tunnel' : 'SECTION 3 — Getting Named Tunnel Token'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-2xl text-lg">
                Ini adalah inti dari panduan ini. Ikuti langkah-langkah di bawah ini dengan teliti untuk mendapatkan kunci akses online Anda.
              </p>

              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-12">
                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">A</div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Navigasi ke Menu Tunnel</h4>
                    <p className="text-slate-600 dark:text-slate-400">
                      Di sidebar kiri Zero Trust Dashboard → klik <strong>Networks</strong> → klik <strong>Connectors</strong>.
                    </p>
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">B</div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Membuat Tunnel Baru</h4>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
                      <li>• Klik <strong>"+ Create a tunnel"</strong></li>
                      <li>• Pilih tipe connector: <strong>Cloudflared</strong></li>
                      <li>• Isi Tunnel Name: (contoh: <code>smekdors</code>)</li>
                      <li>• Klik <strong>"Save Tunnel"</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
                    <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                      <Copy size={18} className="text-blue-400" /> Cara Menyalin Token
                    </h4>
                    <div className="space-y-4">
                      <p className="text-xs text-slate-400">Pilih OS: <strong>Linux</strong> & Distro: <strong>Debian</strong>. Salin string panjang setelah kata <code>service install</code>:</p>
                      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 font-mono text-[10px] text-blue-300 break-all leading-relaxed">
                        sudo cloudflared service install <span className="text-white bg-blue-600 px-1 rounded">eyJhIjoiXXXXXXX...XXXXXX</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <span className="text-green-500 uppercase">TOKEN = eyJhIjoi...</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-4">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <p className="text-[10px] text-red-500 leading-relaxed">
                      <strong>PERINGATAN KEAMANAN:</strong> Token ini bersifat rahasia. Jangan bagikan ke siapapun. Jika bocor, segera buat token baru di dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3D. Konfigurasi Public Hostname */}
              <div className="mt-16 pt-16 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">3D. Konfigurasi Public Hostname (URL Akses Siswa)</h4>
                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <p className="text-slate-600 dark:text-slate-400">
                      Setelah menyimpan token, Anda harus menentukan alamat URL yang akan digunakan siswa untuk mengakses CBT.
                    </p>
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">1</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Klik tab <strong>"Hostname Routes"</strong> di halaman tunnel Anda.</p>
                      </div>
                      <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">2</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Klik <strong>"Add a hostname route"</strong> dan isi formulir sesuai tabel di samping.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold">
                        <tr>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-800">Field</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-800">Contoh Isi</th>
                          <th className="p-4 border-b border-slate-200 dark:border-slate-800">Penjelasan</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-600 dark:text-slate-400 divide-y divide-slate-200 dark:divide-slate-800">
                        <tr>
                          <td className="p-4 font-bold">Subdomain</td>
                          <td className="p-4 font-mono text-blue-600">cbt</td>
                          <td className="p-4">Awalan URL bebas</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-bold">Domain</td>
                          <td className="p-4 font-mono text-blue-600">smekdors.sch.id</td>
                          <td className="p-4">Domain sekolah Anda</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-bold">Type</td>
                          <td className="p-4 font-mono text-blue-600">HTTP</td>
                          <td className="p-4">Protokol koneksi</td>
                        </tr>
                        <tr>
                          <td className="p-4 font-bold">URL</td>
                          <td className="p-4 font-mono text-blue-600">localhost:80</td>
                          <td className="p-4">Alamat internal VHD</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-8 p-6 rounded-2xl bg-blue-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Globe size={24} />
                    <span className="font-bold">URL Publik Siswa: <span className="font-mono underline">https://cbt.smekdors.sch.id</span></span>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-xs opacity-80">
                    <ShieldCheck size={16} /> HTTPS Otomatis Aktif
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 4 — MENGAKTIFKAN MODE ONLINE DI PANEL CBT SCHOOL */}
        <div className="mb-20" data-aos="fade-up">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-12 flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-2xl text-white shadow-lg shadow-blue-500/30">
              <Zap size={28} />
            </div>
            {isID ? 'BAGIAN 4 — Mengaktifkan Mode Online di Panel CBT' : 'SECTION 4 — Activating Online Mode in CBT Panel'}
          </h3>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Langkah Final Aktivasi</h4>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold shrink-0">1</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Buka browser di server, akses panel manajemen CBT School, navigasi ke menu <strong>"Cloudflare Tunnel"</strong>.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold shrink-0">2</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Pilih radio button <strong>"Named Tunnel"</strong> (untuk ujian resmi dengan domain tetap).</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold shrink-0">3</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm"><strong>Paste Token</strong> yang sudah disalin (dimulai dengan <code>eyJh...</code>) ke field yang tersedia.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold shrink-0">4</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Klik tombol <strong>"Aktifkan Tunnel"</strong> dan tunggu 5-15 detik hingga URL muncul.</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex gap-4">
                <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                <div>
                  <h5 className="font-bold text-green-700 dark:text-green-400 mb-1">Berhasil Online!</h5>
                  <p className="text-xs text-green-600 dark:text-green-500 leading-relaxed">Salin URL publik yang muncul dan bagikan ke siswa via WhatsApp Group atau papan tulis proyektor.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
                  <h5 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">CBT Panel GUI Simulation</h5>
                  <div className="space-y-8">
                    <div className="flex gap-8">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                        <span className="text-sm font-medium">Quick Tunnel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-4 border-secondary"></div>
                        <span className="text-sm font-bold text-secondary">Named Tunnel</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Cloudflare Token</label>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-400 truncate">
                        eyJhIjoiYjExMGY0YzEtOWNjZS00MDAwLTkxNjQtZThjY2Q0ZTVhNDkzIiwidCI6Ij...
                      </div>
                    </div>
                    <button className="w-full py-4 bg-secondary text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                      <Zap size={18} /> AKTIFKAN TUNNEL
                    </button>
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                        <p className="text-[10px] text-blue-400 mb-1 font-bold">URL AKTIF:</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 underline">https://cbt.smekdors.sch.id</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-secondary/20 blur-3xl rounded-full"></div>
            </div>
          </div>
        </div>

        {/* BAGIAN 5 — MENGAKHIRI SESI ONLINE */}
        <div className="mb-20" data-aos="fade-up">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] p-8 md:p-16 border border-slate-200 dark:border-slate-700">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-6">
                  {isID ? 'BAGIAN 5 — Mengakhiri Sesi Online' : 'SECTION 5 — Ending Online Session'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Setelah ujian selesai, sangat disarankan untuk menghentikan tunnel demi keamanan data dan efisiensi resource server.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Klik "Hentikan Tunnel"</h5>
                      <p className="text-xs text-slate-500">Tombol berwarna merah di panel CBT akan memutus koneksi publik dalam hitungan detik.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Keamanan Maksimal</h5>
                      <p className="text-xs text-slate-500">Menutup akses publik mencegah akses tidak sah ke sistem CBT setelah jam ujian berakhir.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 p-4 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-600 text-xs font-bold">
                  💡 TIP: Aktifkan tunnel H-10 menit sebelum ujian, hentikan H+10 menit setelah ujian selesai.
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full group-hover:bg-red-500/40 transition-colors"></div>
                  <button className="relative z-10 w-48 h-48 rounded-full bg-white dark:bg-slate-900 border-8 border-red-500/20 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform duration-500 shadow-2xl">
                    <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/50">
                      <Zap size={40} className="rotate-180" />
                    </div>
                    <span className="font-black text-red-600 text-xs tracking-widest uppercase">STOP TUNNEL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 6 — TROUBLESHOOTING */}
        <div className="mb-20" data-aos="fade-up">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <HelpCircle className="text-blue-600" /> {isID ? 'BAGIAN 6 — Troubleshooting Panel CBT' : 'SECTION 6 — Troubleshooting CBT Panel'}
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "Tunnel Tidak Mau Aktif / Loading Terus",
                a: "Pastikan VirtualBox menggunakan Network Adapter 'Bridged' atau 'NAT' yang aktif. Test internet di server dengan membuka browser di dalam VHD."
              },
              {
                q: "URL Muncul Tapi Siswa Tidak Bisa Akses",
                a: "Cek kembali 'Hostname Routes' di Cloudflare Dashboard. Pastikan subdomain, domain, dan URL (localhost:80) sudah benar."
              },
              {
                q: "Token Ditolak / Invalid Token",
                a: "Salin ulang token dengan hati-hati. Pastikan hanya menyalin string panjang yang dimulai dengan 'eyJ...' tanpa spasi tambahan."
              },
              {
                q: "URL Berubah Setiap Restart",
                a: "Pastikan Anda telah memilih mode 'Named Tunnel' sebelum mengaktifkan, bukan 'Quick Tunnel'."
              }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> {item.q}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BAGIAN 7 — PERBANDINGAN */}
        <div className="mb-20" data-aos="fade-up">
          <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
            <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-8 font-black text-xl" colSpan={3}>
                    {isID ? 'Perbandingan Quick Tunnel vs Named Tunnel' : 'Comparison: Quick Tunnel vs Named Tunnel'}
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-bold text-sm">
                  <th className="p-6 border-b border-slate-200 dark:border-slate-800">Aspek</th>
                  <th className="p-6 border-b border-slate-200 dark:border-slate-800">Quick Tunnel</th>
                  <th className="p-6 border-b border-slate-200 dark:border-slate-800">Named Tunnel</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600 dark:text-slate-400 divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Akun Cloudflare</td>
                  <td className="p-6">Tidak perlu</td>
                  <td className="p-6 font-bold text-blue-600">Wajib</td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Domain</td>
                  <td className="p-6">Tidak perlu</td>
                  <td className="p-6 font-bold text-blue-600">Wajib (Milik Sekolah)</td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">URL Akses</td>
                  <td className="p-6 italic">Acak, berubah tiap restart</td>
                  <td className="p-6 font-bold text-green-600">Tetap, tidak pernah berubah</td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Setup</td>
                  <td className="p-6">Sangat cepat (1 klik)</td>
                  <td className="p-6">Perlu setup awal (±30 menit)</td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Cocok Untuk</td>
                  <td className="p-6">Ujian mendadak, percobaan</td>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Ujian rutin resmi sekolah</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* BAGIAN 8 — CHECKLIST PRA-UJIAN */}
        <div className="mb-20" data-aos="fade-up">
          <div className="p-8 md:p-12 rounded-[3rem] bg-slate-50 dark:bg-slate-800/50 border-4 border-dashed border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
              <ListChecks className="text-blue-600" /> {isID ? 'CHECKLIST PRA-UJIAN ONLINE' : 'PRE-EXAM ONLINE CHECKLIST'}
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-blue-600 uppercase text-xs tracking-widest">Persiapan (H-30 Menit)</h4>
                {[
                  "Server VHD dinyalakan",
                  "Aplikasi CBT berjalan normal",
                  "Koneksi internet server aktif",
                  "Cek status tunnel di Cloudflare"
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-secondary uppercase text-xs tracking-widest">Aktivasi (H-10 Menit)</h4>
                {[
                  "Pilih mode Named Tunnel",
                  "Paste token Cloudflare",
                  "Klik 'Aktifkan Tunnel'",
                  "Test URL dari HP proktor"
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0"></div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-green-600 uppercase text-xs tracking-widest">Selesai Ujian</h4>
                {[
                  "Klik 'Hentikan Tunnel'",
                  "Konfirmasi tunnel berhenti",
                  "Backup data hasil ujian",
                  "Catat kendala evaluasi"
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 9 & 10 — KEAMANAN & PENUTUP */}
        <div className="grid md:grid-cols-2 gap-12" data-aos="fade-up">
          <div className="p-10 rounded-[3rem] bg-slate-900 text-white">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <ShieldCheck className="text-green-400" /> Keamanan Data Siswa
            </h3>
            <div className="space-y-6 text-slate-400 text-sm leading-relaxed">
              <p>Cloudflare Tunnel memberikan perlindungan otomatis:</p>
              <ul className="space-y-3">
                <li className="flex gap-3"><CheckCircle2 size={16} className="text-green-400 shrink-0" /> HTTPS/SSL otomatis - data terenkripsi</li>
                <li className="flex gap-3"><CheckCircle2 size={16} className="text-green-400 shrink-0" /> DDoS Protection - server terlindung</li>
                <li className="flex gap-3"><CheckCircle2 size={16} className="text-green-400 shrink-0" /> Bot Filtering - blokir akses otomatis</li>
              </ul>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 italic text-xs">
                "Data hasil ujian tetap berada di server sekolah Anda, tidak pernah disimpan di server Cloudflare."
              </div>
            </div>
          </div>

          <div className="p-10 rounded-[3rem] bg-blue-600 text-white flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-6">Ringkasan Alur</h3>
            <div className="space-y-4 font-bold">
              {[
                "Buat akun & daftarkan domain",
                "Buat tunnel & salin token",
                "Paste token di panel CBT",
                "Aktifkan & bagikan URL",
                "Hentikan setelah ujian"
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">{i + 1}</div>
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-10 border-t border-white/20">
              <p className="text-xs opacity-80 mb-4">Butuh bantuan lebih lanjut?</p>
              <div className="flex gap-4">
                <a href="https://one.dash.cloudflare.com/" target="_blank" className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                  <ExternalLink size={20} />
                </a>
                <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/" target="_blank" className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
                  Dokumentasi Resmi
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default OnlineGuide;
