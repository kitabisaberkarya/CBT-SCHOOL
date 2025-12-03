
import React, { useState, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { supabase } from '../lib/supabaseClient';
import { 
  X, Image, Save, Lock, LayoutDashboard, Type, 
  CreditCard, Phone, List, Layers, LogOut, Upload, Loader2, Trash2, Plus, Video, Users
} from 'lucide-react';
import { Feature, DocItem, PricingPlan } from '../types';

type TabId = 'dashboard' | 'hero' | 'features' | 'docs' | 'pricing' | 'contact' | 'clients';

const AdminPanel: React.FC = () => {
  const { 
    isAdminOpen, setIsAdminOpen, 
    heroImage, setHeroImage,
    heroImage2, setHeroImage2,
    heroImage3, setHeroImage3,
    heroVideo, setHeroVideo,
    heroContent, setHeroContent,
    features, updateFeature,
    studentDocs, updateStudentDoc,
    adminDocs, updateAdminDoc,
    pricingPlans, updatePricingPlan,
    contactInfo, updateContactInfo,
    clients, addClient, deleteClient,
    uploadImage,
    loading
  } = useContent();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Upload State
  const [uploadingState, setUploadingState] = useState<{ isUploading: boolean, id: string | null }>({
    isUploading: false,
    id: null
  });

  // --- LOCAL DRAFT STATES (Agar tidak auto-save ke DB) ---
  const [localHeroContent, setLocalHeroContent] = useState(heroContent);
  const [localHeroImages, setLocalHeroImages] = useState({ img1: heroImage, img2: heroImage2, img3: heroImage3 });
  const [localHeroVideo, setLocalHeroVideo] = useState(heroVideo); // State video lokal
  
  const [localFeatures, setLocalFeatures] = useState<Feature[]>(features);
  const [localStudentDocs, setLocalStudentDocs] = useState<DocItem[]>(studentDocs);
  const [localAdminDocs, setLocalAdminDocs] = useState<DocItem[]>(adminDocs);
  const [localPricing, setLocalPricing] = useState<PricingPlan[]>(pricingPlans);
  const [localContact, setLocalContact] = useState(contactInfo);

  // Sync Context to Local State when Context updates (Initial Load)
  useEffect(() => {
    if (!loading) {
      setLocalHeroContent(heroContent);
      setLocalHeroImages({ img1: heroImage, img2: heroImage2, img3: heroImage3 });
      setLocalHeroVideo(heroVideo);
      setLocalFeatures(features);
      setLocalStudentDocs(studentDocs);
      setLocalAdminDocs(adminDocs);
      setLocalPricing(pricingPlans);
      setLocalContact(contactInfo);
    }
  }, [loading, heroContent, heroImage, heroImage2, heroImage3, heroVideo, features, studentDocs, adminDocs, pricingPlans, contactInfo]);

  // Cek sesi saat komponen dimount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
      }
    };
    checkSession();
  }, []);

  if (!isAdminOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setAuthError(error.message || 'Login gagal. Periksa email dan password.');
      } else if (data.session) {
        setIsLoggedIn(true);
        setPassword(''); 
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan koneksi.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsAdminOpen(false);
    setActiveTab('dashboard');
  };

  // Generic File Upload Handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    folder: string,
    callback: (url: string) => void,
    loadingId: string = 'global'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batas 5MB untuk video, 2MB untuk gambar
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024; // 10MB Video, 2MB Img

    if (file.size > maxSize) { 
      alert(`Ukuran file terlalu besar. Maksimal ${isVideo ? '10MB untuk video' : '2MB untuk gambar'}.`);
      return;
    }

    setUploadingState({ isUploading: true, id: loadingId });

    try {
      const publicUrl = await uploadImage(file, folder);
      if (publicUrl) {
        callback(publicUrl);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat upload.");
    } finally {
      setUploadingState({ isUploading: false, id: null });
    }
  };

  // --- SAVE HANDLERS (Commit Local Draft to DB) ---

  const handleSaveHero = async () => {
    if (!window.confirm("Simpan perubahan pada Hero Section?")) return;

    try {
      await setHeroContent(localHeroContent);
      await setHeroImage(localHeroImages.img1);
      await setHeroImage2(localHeroImages.img2);
      await setHeroImage3(localHeroImages.img3);
      await setHeroVideo(localHeroVideo); // Simpan Video
      alert("Berhasil disimpan!");
    } catch (e) {
      alert("Gagal menyimpan.");
    }
  };

  const handleSaveFeature = async (id: string) => {
    const feature = localFeatures.find(f => f.id === id);
    if (!feature) return;
    try {
      await updateFeature(id, feature);
      alert("Fitur berhasil diupdate!");
    } catch (e) { alert("Gagal update."); }
  };

  const handleSaveDoc = async (id: string, type: 'student' | 'admin') => {
    const docs = type === 'student' ? localStudentDocs : localAdminDocs;
    const item = docs.find(d => d.id === id);
    if(!item) return;
    try {
      if(type === 'student') await updateStudentDoc(id, item);
      else await updateAdminDoc(id, item);
      alert("Dokumentasi berhasil diupdate!");
    } catch (e) { alert("Gagal update."); }
  };

  const handleSavePricing = async (index: number) => {
     try {
       await updatePricingPlan(index, localPricing[index]);
       alert("Harga paket berhasil disimpan!");
     } catch(e) { alert("Gagal menyimpan harga."); }
  };

  const handleSaveContact = async () => {
    try {
      await updateContactInfo(localContact);
      alert("Kontak berhasil disimpan!");
    } catch(e) { alert("Gagal menyimpan kontak."); }
  };

  // Client addition
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientLogo) {
      alert("Nama dan Logo wajib diisi!");
      return;
    }
    await addClient(newClientName, newClientLogo);
    setNewClientName('');
    setNewClientLogo('');
    setIsAddingClient(false);
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-md relative shadow-2xl">
          <button onClick={() => setIsAdminOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X />
          </button>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-white">Admin Login</h2>
            <p className="text-slate-400 text-sm mt-2">Masuk menggunakan akun administrator.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Email Developer</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary transition-colors"
                placeholder="developer@vendor.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-secondary transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-secondary hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center"
            >
              {authLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- SIDEBAR ---
  const SidebarItem = ({ id, label, icon: Icon }: { id: TabId, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        activeTab === id 
          ? 'bg-secondary text-white shadow-lg shadow-blue-500/20' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-[#0b1120] border border-white/10 rounded-3xl w-full h-full flex overflow-hidden shadow-2xl relative">
        
        {/* SIDEBAR */}
        <div className="w-64 bg-slate-900/50 border-r border-white/5 flex-col hidden md:flex">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold text-white tracking-wide">CBT <span className="text-secondary">ADMIN</span></h2>
            <p className="text-xs text-slate-500 mt-1">Content Management System</p>
          </div>
          
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            <SidebarItem id="dashboard" label="Overview" icon={LayoutDashboard} />
            <div className="px-4 pt-4 pb-2 text-xs font-bold text-slate-600 uppercase">Konten Utama</div>
            <SidebarItem id="hero" label="Hero & Header" icon={Type} />
            <SidebarItem id="features" label="Fitur Aplikasi" icon={List} />
            <SidebarItem id="docs" label="Dokumentasi" icon={Layers} />
            <SidebarItem id="clients" label="Clients / Partner" icon={Users} />
            <div className="px-4 pt-4 pb-2 text-xs font-bold text-slate-600 uppercase">Bisnis</div>
            <SidebarItem id="pricing" label="Harga & Paket" icon={CreditCard} />
            <SidebarItem id="contact" label="Kontak Info" icon={Phone} />
          </div>

          <div className="p-4 border-t border-white/5">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold"
            >
              <LogOut size={16} /> Keluar Panel
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b1120]">
          {/* Header Mobile Only */}
          <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center bg-slate-900">
            <span className="font-bold text-white">Admin Panel</span>
            <button onClick={() => setIsAdminOpen(false)}><X className="text-white" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Selamat Datang, Admin</h1>
                    <p className="text-slate-400">Anda login sebagai: <span className="text-secondary">{email}</span></p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
                        <List size={20} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">{features.length}</h3>
                      <p className="text-sm text-slate-500">Fitur Ditampilkan</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 mb-4">
                        <Users size={20} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">{clients.length}</h3>
                      <p className="text-sm text-slate-500">Clients / Partner</p>
                    </div>
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 mb-4">
                        <Layers size={20} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">{studentDocs.length + adminDocs.length}</h3>
                      <p className="text-sm text-slate-500">Item Dokumentasi</p>
                    </div>
                  </div>
                </div>
              )}

              {/* HERO TAB */}
              {activeTab === 'hero' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold text-white">Pengaturan Hero Section</h2>
                    <button 
                      onClick={handleSaveHero}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-green-900/20 transition-all hover:scale-105"
                    >
                      <Save size={18} className="mr-2" /> Simpan Perubahan
                    </button>
                  </div>

                  <div className="grid gap-6 bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Judul Utama</label>
                      <input 
                        type="text" 
                        value={localHeroContent.title}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, title: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Sub Judul (Gradient)</label>
                      <input 
                        type="text" 
                        value={localHeroContent.subtitle}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, subtitle: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Deskripsi</label>
                      <textarea 
                        value={localHeroContent.description}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, description: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white h-24"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Teks Tombol CTA</label>
                      <input 
                        type="text" 
                        value={localHeroContent.ctaText}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, ctaText: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* 3D SLIDER SETTINGS */}
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-6">Pengaturan Slide Gambar 3D</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      
                      {/* SLIDE 1 (Utama) - Full Width */}
                      <div className="col-span-2 space-y-2">
                         <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Slide 1 (Utama)</label>
                         <div className="relative group w-full aspect-video md:aspect-[21/9] bg-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-secondary transition-colors cursor-pointer">
                            <img 
                              src={localHeroImages.img1} 
                              alt="Slide 1" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all">
                                <Upload className="w-10 h-10 text-white mb-2" />
                                <span className="text-sm font-bold text-white">Klik untuk ganti gambar 1</span>
                            </div>
                            <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img1: url})), 'hero1')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                            />
                            {uploadingState.isUploading && uploadingState.id === 'hero1' && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                    <Loader2 className="animate-spin text-white w-10 h-10" />
                                </div>
                            )}
                         </div>
                      </div>

                      {/* SLIDE 2 */}
                      <div className="col-span-1 space-y-2">
                         <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Slide 2</label>
                         <div className="relative group w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-secondary transition-colors cursor-pointer">
                            <img 
                              src={localHeroImages.img2} 
                              alt="Slide 2" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all">
                                <span className="text-xs font-bold text-white border border-white/30 px-3 py-1 rounded-full">Ganti Slide 2</span>
                            </div>
                            <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img2: url})), 'hero2')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                            />
                            {uploadingState.isUploading && uploadingState.id === 'hero2' && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                    <Loader2 className="animate-spin text-white" />
                                </div>
                            )}
                         </div>
                      </div>

                      {/* SLIDE 3 */}
                      <div className="col-span-1 space-y-2">
                         <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Slide 3</label>
                         <div className="relative group w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-secondary transition-colors cursor-pointer">
                            <img 
                              src={localHeroImages.img3} 
                              alt="Slide 3" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all">
                                <span className="text-xs font-bold text-white border border-white/30 px-3 py-1 rounded-full">Ganti Slide 3</span>
                            </div>
                            <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img3: url})), 'hero3')}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                            />
                            {uploadingState.isUploading && uploadingState.id === 'hero3' && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                    <Loader2 className="animate-spin text-white" />
                                </div>
                            )}
                         </div>
                      </div>

                    </div>
                  </div>

                  {/* VIDEO PROMOSI SETTINGS */}
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-2">Video Promosi / Demo</h3>
                    <p className="text-xs text-slate-400 mb-6">
                      Jika URL video diisi, website akan menampilkan Video di halaman depan menggantikan Slider Gambar 3D. <br/>
                      Kosongkan input untuk kembali menggunakan Slider.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* INPUT */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Upload Video (MP4)</label>
                          <div className="flex items-center gap-4">
                             <button className="relative bg-slate-900 border border-slate-700 hover:border-secondary text-white px-4 py-3 rounded-lg flex items-center transition-all">
                                {uploadingState.isUploading && uploadingState.id === 'video_upload' ? (
                                   <Loader2 className="animate-spin mr-2" size={18} />
                                ) : (
                                   <Upload className="mr-2" size={18} />
                                )}
                                Pilih File Video
                                <input 
                                  type="file" 
                                  accept="video/mp4,video/webm"
                                  onChange={(e) => handleFileUpload(e, 'videos', (url) => setLocalHeroVideo(url), 'video_upload')}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                             </button>
                             <span className="text-xs text-slate-500">Max 10MB</span>
                          </div>
                        </div>
                        
                        <div className="relative flex items-center">
                           <div className="flex-grow border-t border-white/10"></div>
                           <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase">ATAU URL Manual</span>
                           <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Link Video Langsung</label>
                          <input 
                            type="text" 
                            value={localHeroVideo}
                            onChange={(e) => setLocalHeroVideo(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm"
                          />
                        </div>

                        {localHeroVideo && (
                          <button 
                            onClick={() => setLocalHeroVideo('')}
                            className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center"
                          >
                            <Trash2 size={14} className="mr-1" /> Hapus Video (Gunakan Slider)
                          </button>
                        )}
                      </div>

                      {/* PREVIEW */}
                      <div>
                         <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Preview Video</label>
                         <div className="w-full aspect-video bg-black rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden">
                            {localHeroVideo ? (
                               <video src={localHeroVideo} controls className="w-full h-full object-contain" />
                            ) : (
                               <div className="text-center text-slate-500 p-6">
                                  <Video size={32} className="mx-auto mb-2 opacity-50" />
                                  <p className="text-xs">Tidak ada video dipilih.</p>
                                  <p className="text-xs opacity-70">Slider 3D akan ditampilkan.</p>
                               </div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FEATURES TAB */}
              {activeTab === 'features' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-white mb-6">Edit Fitur Aplikasi</h2>
                  <div className="grid gap-6">
                    {localFeatures.map((feature, idx) => (
                      <div key={feature.id} className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 flex gap-6 items-start">
                        <div className="w-24 h-24 bg-slate-900 rounded-xl flex-shrink-0 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                           {feature.imageUrl ? (
                             <img src={feature.imageUrl} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <span className="text-slate-600 text-xs text-center px-2">No Image</span>
                           )}
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Image size={20} className="text-white" />
                           </div>
                           <input 
                              type="file" 
                              onChange={(e) => handleFileUpload(e, 'features', (url) => {
                                const newFeatures = [...localFeatures];
                                newFeatures[idx] = { ...newFeatures[idx], imageUrl: url };
                                setLocalFeatures(newFeatures);
                              }, `feat-${feature.id}`)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                           />
                           {uploadingState.isUploading && uploadingState.id === `feat-${feature.id}` && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                 <Loader2 className="animate-spin text-white w-6 h-6" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text" 
                            value={feature.title}
                            onChange={(e) => {
                              const newFeatures = [...localFeatures];
                              newFeatures[idx].title = e.target.value;
                              setLocalFeatures(newFeatures);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                          />
                          <textarea 
                            value={feature.description}
                            onChange={(e) => {
                                const newFeatures = [...localFeatures];
                                newFeatures[idx].description = e.target.value;
                                setLocalFeatures(newFeatures);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm h-20"
                          />
                          <div className="flex justify-end">
                             <button 
                                onClick={() => handleSaveFeature(feature.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center"
                             >
                                <Save size={14} className="mr-2" /> Simpan Item
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DOCS TAB */}
              {activeTab === 'docs' && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Modul Siswa</h2>
                    <div className="space-y-4">
                      {localStudentDocs.map((item, idx) => (
                        <div key={item.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                           <div className="w-16 h-16 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group">
                              {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                              <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                    const newDocs = [...localStudentDocs];
                                    newDocs[idx].imageUrl = url;
                                    setLocalStudentDocs(newDocs);
                                }, `stu-${item.id}`)}
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                              />
                           </div>
                           <input 
                             value={item.title}
                             onChange={(e) => {
                                const newDocs = [...localStudentDocs];
                                newDocs[idx].title = e.target.value;
                                setLocalStudentDocs(newDocs);
                             }}
                             className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                           />
                           <button onClick={() => handleSaveDoc(item.id, 'student')} className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors">
                              <Save size={18} />
                           </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Modul Admin</h2>
                    <div className="space-y-4">
                      {localAdminDocs.map((item, idx) => (
                        <div key={item.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                           <div className="w-16 h-16 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group">
                              {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                              <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                    const newDocs = [...localAdminDocs];
                                    newDocs[idx].imageUrl = url;
                                    setLocalAdminDocs(newDocs);
                                }, `adm-${item.id}`)}
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                              />
                           </div>
                           <input 
                             value={item.title}
                             onChange={(e) => {
                                const newDocs = [...localAdminDocs];
                                newDocs[idx].title = e.target.value;
                                setLocalAdminDocs(newDocs);
                             }}
                             className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                           />
                           <button onClick={() => handleSaveDoc(item.id, 'admin')} className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors">
                              <Save size={18} />
                           </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PRICING TAB */}
              {activeTab === 'pricing' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-white mb-6">Edit Paket Harga</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {localPricing.map((plan, idx) => (
                      <div key={idx} className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-4">
                        <div>
                          <label className="text-xs text-slate-500 uppercase font-bold">Nama Paket</label>
                          <input 
                            value={plan.name}
                            onChange={(e) => {
                                const newPricing = [...localPricing];
                                newPricing[idx].name = e.target.value;
                                setLocalPricing(newPricing);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                          />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 uppercase font-bold">Harga</label>
                            <input 
                                value={plan.price}
                                onChange={(e) => {
                                    const newPricing = [...localPricing];
                                    newPricing[idx].price = e.target.value;
                                    setLocalPricing(newPricing);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 uppercase font-bold">Periode</label>
                            <input 
                                value={plan.period}
                                onChange={(e) => {
                                    const newPricing = [...localPricing];
                                    newPricing[idx].period = e.target.value;
                                    setLocalPricing(newPricing);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                            />
                          </div>
                        </div>
                        <button 
                           onClick={() => handleSavePricing(idx)}
                           className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold flex items-center justify-center mt-4"
                        >
                           <Save size={16} className="mr-2" /> Simpan Paket Ini
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTACT TAB */}
              {activeTab === 'contact' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                     <h2 className="text-2xl font-bold text-white">Kontak & Personal</h2>
                     <button 
                       onClick={handleSaveContact}
                       className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-green-900/20"
                     >
                       <Save size={18} className="mr-2" /> Simpan Kontak
                     </button>
                  </div>
                  
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Nama Lengkap</label>
                      <input 
                        value={localContact.name}
                        onChange={(e) => setLocalContact({...localContact, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Jabatan / Role</label>
                      <input 
                        value={localContact.role}
                        onChange={(e) => setLocalContact({...localContact, role: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Nomor WhatsApp</label>
                      <input 
                        value={localContact.phone}
                        onChange={(e) => setLocalContact({...localContact, phone: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                        placeholder="Contoh: 0821-xxxx-xxxx"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CLIENTS TAB */}
              {activeTab === 'clients' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold text-white">Clients & Partners</h2>
                    <button 
                      onClick={() => setIsAddingClient(true)}
                      className="bg-secondary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center text-sm font-bold"
                    >
                      <Plus size={16} className="mr-2" /> Tambah Client
                    </button>
                  </div>
                  
                  {isAddingClient && (
                     <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/10 animate-fade-in">
                        <h3 className="text-lg font-bold text-white mb-4">Tambah Client Baru</h3>
                        <form onSubmit={handleAddClient} className="space-y-4">
                           <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nama Sekolah / Instansi</label>
                              <input 
                                 type="text"
                                 value={newClientName}
                                 onChange={(e) => setNewClientName(e.target.value)}
                                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                 placeholder="Misal: SMA Negeri 1 Jakarta"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Upload Logo</label>
                              <div className="flex items-center gap-4">
                                 <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden relative group">
                                    {uploadingState.isUploading && uploadingState.id === 'new_client_logo' ? (
                                       <Loader2 className="animate-spin text-white" />
                                    ) : newClientLogo ? (
                                       <img src={newClientLogo} alt="Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                       <div className="text-center text-slate-600 text-xs">
                                          <Upload size={20} className="mx-auto mb-1" />
                                          Upload
                                       </div>
                                    )}
                                    <input 
                                       type="file"
                                       onChange={(e) => handleFileUpload(e, 'clients', setNewClientLogo, 'new_client_logo')}
                                       className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                 </div>
                                 <div className="text-xs text-slate-500">
                                    Format: PNG/JPG. <br/> Background transparan disarankan.
                                 </div>
                              </div>
                           </div>
                           <div className="flex justify-end gap-3 pt-4">
                              <button 
                                 type="button" 
                                 onClick={() => setIsAddingClient(false)}
                                 className="px-4 py-2 text-slate-400 hover:text-white"
                              >
                                 Batal
                              </button>
                              <button 
                                 type="submit"
                                 className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold"
                              >
                                 Simpan
                              </button>
                           </div>
                        </form>
                     </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {clients.map((client) => (
                        <div key={client.id} className="bg-slate-800/30 border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/5 rounded-lg p-2 flex items-center justify-center">
                                 <img src={client.logoUrl} alt={client.name} className="max-w-full max-h-full" />
                              </div>
                              <span className="font-medium text-white">{client.name}</span>
                           </div>
                           <button 
                              type="button"
                              onClick={() => {
                                 if(window.confirm('Hapus client ini?')) deleteClient(client.id);
                              }}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                     {clients.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                           Belum ada data client.
                        </div>
                     )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
