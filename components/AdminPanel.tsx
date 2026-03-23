
import React, { useState, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { supabase } from '../lib/supabaseClient';
import { 
  X, Image, Save, Lock, LayoutDashboard, Type, 
  CreditCard, Phone, List, Layers, LogOut, Upload, Loader2, Trash2, Plus, Video, Users, ArrowLeft, Menu, Images, User
} from 'lucide-react';
import { Feature, DocItem, PricingPlan, ContactInfo } from '../types';

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
    contacts, updateContact,
    clients, addClient, deleteClient,
    uploadImage,
    loading
  } = useContent();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Control sidebar on mobile
  
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

  // Client addition
  const [newClientName, setNewClientName] = useState('');
  const [newClientLogo, setNewClientLogo] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);

  // --- LOCAL DRAFT STATES ---
  const [localHeroContent, setLocalHeroContent] = useState(heroContent);
  const [localHeroImages, setLocalHeroImages] = useState({ img1: heroImage, img2: heroImage2, img3: heroImage3 });
  const [localHeroVideo, setLocalHeroVideo] = useState(heroVideo); 
  
  const [localFeatures, setLocalFeatures] = useState<Feature[]>(features);
  const [localStudentDocs, setLocalStudentDocs] = useState<DocItem[]>(studentDocs);
  const [localAdminDocs, setLocalAdminDocs] = useState<DocItem[]>(adminDocs);
  const [localPricing, setLocalPricing] = useState<PricingPlan[]>(pricingPlans);
  const [localContacts, setLocalContacts] = useState(contacts);

  // Sync Context to Local State
  useEffect(() => {
    if (!loading) {
      setLocalHeroContent(heroContent);
      setLocalHeroImages({ img1: heroImage, img2: heroImage2, img3: heroImage3 });
      setLocalHeroVideo(heroVideo);
      setLocalFeatures(features);
      setLocalStudentDocs(studentDocs);
      setLocalAdminDocs(adminDocs);
      setLocalPricing(pricingPlans);
      setLocalContacts(contacts);
    }
  }, [loading, heroContent, heroImage, heroImage2, heroImage3, heroVideo, features, studentDocs, adminDocs, pricingPlans, contacts]);

  // Cek sesi
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

  const handleClosePanel = () => {
    setIsAdminOpen(false);
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

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024; 

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

  // --- SAVE HANDLERS ---

  const handleSaveHero = async () => {
    if (!window.confirm("Simpan perubahan pada Hero Section?")) return;
    try {
      await setHeroContent(localHeroContent);
      await setHeroImage(localHeroImages.img1);
      await setHeroImage2(localHeroImages.img2);
      await setHeroImage3(localHeroImages.img3);
      await setHeroVideo(localHeroVideo);
      alert("Berhasil disimpan!");
    } catch (e) { alert("Gagal menyimpan."); }
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

  const handleSaveContact = async (id: string) => {
    try {
      const contact = localContacts.find(c => c.id === id);
      if (contact) {
        await updateContact(id, contact);
        alert("Kontak berhasil disimpan!");
      }
    } catch(e) { alert("Gagal menyimpan kontak."); }
  };

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

  // --- GALLERY HELPERS ---
  const addToGallery = (
    url: string, 
    docId: string, 
    type: 'student' | 'admin'
  ) => {
    if (type === 'student') {
        setLocalStudentDocs(prev => prev.map(d => {
            if (d.id !== docId) return d;
            const currentGallery = d.gallery || [];
            return { ...d, gallery: [...currentGallery, url] };
        }));
    } else {
        setLocalAdminDocs(prev => prev.map(d => {
            if (d.id !== docId) return d;
            const currentGallery = d.gallery || [];
            return { ...d, gallery: [...currentGallery, url] };
        }));
    }
  };

  const removeFromGallery = (
    docId: string, 
    imgIndex: number, 
    type: 'student' | 'admin'
  ) => {
    if (type === 'student') {
        setLocalStudentDocs(prev => prev.map(d => {
            if (d.id !== docId) return d;
            const newGallery = [...(d.gallery || [])];
            newGallery.splice(imgIndex, 1);
            return { ...d, gallery: newGallery };
        }));
    } else {
        setLocalAdminDocs(prev => prev.map(d => {
            if (d.id !== docId) return d;
            const newGallery = [...(d.gallery || [])];
            newGallery.splice(imgIndex, 1);
            return { ...d, gallery: newGallery };
        }));
    }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1120] bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-black/80">
        <div className="bg-slate-900/90 border border-white/10 p-10 rounded-3xl w-full max-w-md relative shadow-2xl backdrop-blur-xl">
          <button onClick={() => setIsAdminOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-secondary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20 transform rotate-3">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Admin Portal</h2>
            <p className="text-slate-400 text-sm mt-3">Silakan masuk untuk mengelola konten website.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {authError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center font-medium">
                {authError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Email Access</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                placeholder="developer@vendor.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Security Key</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-secondary to-blue-600 hover:to-blue-500 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {authLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Verifying Credentials...
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- SIDEBAR COMPONENT ---
  const SidebarItem = ({ id, label, icon: Icon }: { id: TabId, label: string, icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
        activeTab === id 
          ? 'bg-secondary text-white shadow-lg shadow-blue-500/25' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
      {label}
      {activeTab === id && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b1120] text-slate-200 font-sans flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-slate-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
               <h2 className="text-xl font-bold text-white tracking-tight">CBT <span className="text-secondary">PANEL</span></h2>
               <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Admin Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
            <div className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-2">Main Menu</div>
            <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
            
            <div className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-6">Content Management</div>
            <SidebarItem id="hero" label="Hero Section" icon={Type} />
            <SidebarItem id="features" label="Fitur Aplikasi" icon={List} />
            <SidebarItem id="docs" label="Dokumentasi" icon={Layers} />
            <SidebarItem id="clients" label="Clients & Partners" icon={Users} />
            
            <div className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 mt-6">Commerce</div>
            <SidebarItem id="pricing" label="Harga & Paket" icon={CreditCard} />
            <SidebarItem id="contact" label="Kontak & Info" icon={Phone} />
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-start gap-3 px-5 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-semibold group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            Sign Out
          </button>
        </div>
      </aside>

      {/* OVERLAY for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0b1120] relative">
        
        {/* TOP BAR */}
        <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 md:px-10 sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
               className="md:hidden p-2 text-slate-400 hover:text-white"
             >
               <Menu size={24} />
             </button>
             <h1 className="text-xl font-bold text-white capitalize hidden md:block">
               {activeTab.replace('-', ' ')}
             </h1>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-white">Administrator</span>
                <span className="text-xs text-secondary">{email}</span>
             </div>
             <button 
                onClick={handleClosePanel}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-full text-xs font-bold transition-all"
             >
                <ArrowLeft size={14} /> Back to Website
             </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          <div className="max-w-6xl mx-auto pb-20">
            
            {/* DASHBOARD */}
            {activeTab === 'dashboard' && (
               <div className="animate-fade-in space-y-8">
                  <div className="bg-gradient-to-r from-secondary/20 to-accent/10 border border-secondary/20 rounded-3xl p-8 relative overflow-hidden">
                     <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome back!</h2>
                        <p className="text-slate-300 max-w-2xl">
                           Kelola seluruh konten landing page CBT School Anda dari satu tempat. Perubahan akan langsung diterapkan secara realtime.
                        </p>
                     </div>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stat Card 1 */}
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                          <List size={24} />
                        </div>
                        <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Active</span>
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-1">{features.length}</h3>
                      <p className="text-sm text-slate-500">Fitur Aplikasi</p>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                          <Users size={24} />
                        </div>
                        <span className="text-xs font-bold bg-orange-500/20 text-orange-300 px-2 py-1 rounded">Partners</span>
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-1">{clients.length}</h3>
                      <p className="text-sm text-slate-500">Klien Terdaftar</p>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                          <Layers size={24} />
                        </div>
                        <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Modules</span>
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-1">{studentDocs.length + adminDocs.length}</h3>
                      <p className="text-sm text-slate-500">Item Dokumentasi</p>
                    </div>
                  </div>
               </div>
            )}

            {/* HERO */}
            {activeTab === 'hero' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex justify-between items-center">
                   <div>
                      <h2 className="text-2xl font-bold text-white">Hero Section</h2>
                      <p className="text-slate-400 text-sm">Ubah tampilan utama dan kalimat pembuka.</p>
                   </div>
                   <button 
                      onClick={handleSaveHero}
                      className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-green-900/20 transition-all hover:-translate-y-1"
                    >
                      <Save size={18} className="mr-2" /> Simpan Perubahan
                    </button>
                </div>

                <div className="grid gap-6 bg-slate-800/40 p-8 rounded-3xl border border-white/5">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Judul Utama</label>
                          <input 
                            type="text" 
                            value={localHeroContent.title}
                            onChange={(e) => setLocalHeroContent({...localHeroContent, title: e.target.value})}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary transition-colors"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Sub Judul (Gradient)</label>
                          <input 
                            type="text" 
                            value={localHeroContent.subtitle}
                            onChange={(e) => setLocalHeroContent({...localHeroContent, subtitle: e.target.value})}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary transition-colors"
                          />
                       </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Deskripsi</label>
                      <textarea 
                        value={localHeroContent.description}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, description: e.target.value})}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white h-24 focus:border-secondary transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Teks Tombol CTA</label>
                      <input 
                        type="text" 
                        value={localHeroContent.ctaText}
                        onChange={(e) => setLocalHeroContent({...localHeroContent, ctaText: e.target.value})}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary transition-colors"
                      />
                    </div>
                </div>

                {/* 3D Slider & Video */}
                <div className="grid md:grid-cols-2 gap-8">
                   
                   {/* IMAGE SLIDER */}
                   <div className="space-y-6">
                      <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2">3D Image Slider</h3>
                      
                      {/* SLIDE 1 */}
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-secondary uppercase tracking-wider">Slide 1 (Utama)</label>
                         <div className="relative group w-full h-32 bg-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-secondary transition-colors cursor-pointer">
                            <img 
                              src={localHeroImages.img1} 
                              alt="Slide 1" 
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20">
                                <Upload className="w-8 h-8 text-white mb-1" />
                                <span className="text-[10px] font-bold text-white uppercase">Ganti Gambar 1</span>
                            </div>
                            <input 
                                type="file" 
                                onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img1: url})), 'hero1')}
                                className="absolute inset-0 opacity-0 cursor-pointer z-30"
                                accept="image/*"
                                title="Klik untuk mengubah foto"
                                onClick={(e) => (e.target as HTMLInputElement).value = ''}
                            />
                            {uploadingState.isUploading && uploadingState.id === 'hero1' && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                    <Loader2 className="animate-spin text-white w-8 h-8" />
                                </div>
                            )}
                         </div>
                      </div>

                      {/* SLIDES 2 & 3 */}
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slide 2</label>
                            <div className="relative group w-full h-24 bg-slate-900 rounded-xl overflow-hidden border border-white/10 hover:border-secondary transition-colors cursor-pointer">
                                <img src={localHeroImages.img2} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                <input 
                                   type="file" 
                                   onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img2: url})), 'hero2')}
                                   className="absolute inset-0 opacity-0 cursor-pointer z-30"
                                   accept="image/*"
                                   title="Klik untuk mengubah foto"
                                   onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                />
                                {uploadingState.isUploading && uploadingState.id === 'hero2' && (
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                        <Loader2 className="animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slide 3</label>
                            <div className="relative group w-full h-24 bg-slate-900 rounded-xl overflow-hidden border border-white/10 hover:border-secondary transition-colors cursor-pointer">
                                <img src={localHeroImages.img3} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                <input 
                                   type="file" 
                                   onChange={(e) => handleFileUpload(e, 'hero', (url) => setLocalHeroImages(prev => ({...prev, img3: url})), 'hero3')}
                                   className="absolute inset-0 opacity-0 cursor-pointer z-30"
                                   accept="image/*"
                                   title="Klik untuk mengubah foto"
                                   onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                />
                                {uploadingState.isUploading && uploadingState.id === 'hero3' && (
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                        <Loader2 className="animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* VIDEO SECTION */}
                   <div className="space-y-6">
                      <h3 className="text-lg font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                         <Video size={18} className="text-secondary" /> Video Promosi
                      </h3>
                      <div className="bg-slate-800/40 p-5 rounded-2xl border border-white/5">
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                           Video akan menggantikan Image Slider jika aktif. Kosongkan URL untuk kembali ke Slider.
                        </p>

                        <div className="w-full aspect-video bg-black rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden mb-4 relative">
                           {localHeroVideo ? (
                              <video 
                                key={localHeroVideo} // Add key for immediate refresh 
                                src={localHeroVideo} 
                                controls 
                                className="w-full h-full object-contain" 
                              />
                           ) : (
                              <div className="text-center text-slate-600">
                                 <Video size={28} className="mx-auto mb-1 opacity-50" />
                                 <p className="text-[10px]">No active video</p>
                              </div>
                           )}
                           
                           {/* Upload Button Overlay */}
                           <div className="absolute bottom-3 right-3 z-30">
                              <button className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center relative overflow-hidden">
                                 {uploadingState.isUploading && uploadingState.id === 'video_upload' ? <Loader2 className="animate-spin mr-1" size={12}/> : <Upload className="mr-1" size={12}/>}
                                 Upload Video
                                 <input 
                                    type="file" 
                                    accept="video/mp4,video/webm"
                                    onChange={(e) => handleFileUpload(e, 'videos', (url) => setLocalHeroVideo(url), 'video_upload')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                 />
                              </button>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase text-slate-500">URL Manual</label>
                           <div className="flex gap-2">
                              <input 
                                 type="text" 
                                 value={localHeroVideo}
                                 onChange={(e) => setLocalHeroVideo(e.target.value)}
                                 placeholder="https://..."
                                 className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                              />
                              {localHeroVideo && (
                                 <button 
                                    onClick={() => setLocalHeroVideo('')}
                                    className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              )}
                           </div>
                        </div>
                      </div>
                   </div>

                </div>
              </div>
            )}

            {/* FEATURES */}
            {activeTab === 'features' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <div>
                     <h2 className="text-2xl font-bold text-white">Edit Fitur Aplikasi</h2>
                     <p className="text-slate-400 text-sm">Kelola daftar fitur unggulan aplikasi.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {localFeatures.map((feature, idx) => {
                    return (
                      <div key={feature.id} className="bg-slate-800/40 p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 items-start hover:border-white/10 transition-colors">
                        
                        {/* IMAGE SECTION - AVAILABLE FOR ALL ITEMS */}
                        <div className={`w-full md:w-56 h-32 rounded-xl flex-shrink-0 border border-white/10 flex items-center justify-center relative overflow-hidden group bg-slate-900`}>
                           {feature.imageUrl ? (
                             <img src={feature.imageUrl} alt="" className="w-full h-full object-cover z-0" />
                           ) : (
                             <span className="text-slate-600 text-xs text-center px-2 z-0">No Image</span>
                           )}
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                              <Image size={24} className="text-white mb-1" />
                              <span className="text-[10px] text-white font-bold uppercase">Ubah Foto</span>
                           </div>
                           <input 
                              type="file"
                              accept="image/*"
                              title="Klik untuk mengubah foto"
                              onClick={(e) => (e.target as HTMLInputElement).value = ''}
                              onChange={(e) => handleFileUpload(e, 'features', (url) => {
                                setLocalFeatures(prev => prev.map(f => f.id === feature.id ? { ...f, imageUrl: url } : f));
                              }, `feat-${feature.id}`)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                           />
                           {uploadingState.isUploading && uploadingState.id === `feat-${feature.id}` && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                 <Loader2 className="animate-spin text-white w-6 h-6" />
                              </div>
                           )}
                        </div>

                        {/* TEXT CONTENT */}
                        <div className="flex-1 space-y-3 w-full">
                           <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-slate-500">
                                 {idx + 1}
                              </span>
                              <input 
                                 type="text" 
                                 value={feature.title}
                                 onChange={(e) => {
                                    setLocalFeatures(prev => {
                                        const newFeatures = [...prev];
                                        newFeatures[idx] = { ...newFeatures[idx], title: e.target.value };
                                        return newFeatures;
                                    });
                                 }}
                                 className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white font-bold focus:border-secondary transition-colors"
                              />
                           </div>
                           <textarea 
                              value={feature.description}
                              onChange={(e) => {
                                 setLocalFeatures(prev => {
                                    const newFeatures = [...prev];
                                    newFeatures[idx] = { ...newFeatures[idx], description: e.target.value };
                                    return newFeatures;
                                });
                              }}
                              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm h-24 focus:border-secondary transition-colors resize-none"
                           />
                           <div className="flex justify-end">
                              <button 
                                 onClick={() => handleSaveFeature(feature.id)}
                                 className="bg-white/5 hover:bg-green-600 hover:text-white text-slate-300 text-xs font-bold px-4 py-2 rounded-lg flex items-center transition-all border border-white/10 hover:border-transparent"
                              >
                                 <Save size={14} className="mr-2" /> Simpan Item
                              </button>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DOCS */}
            {activeTab === 'docs' && (
               <div className="space-y-10 animate-fade-in">
                  {/* Student Docs */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/5 pb-2">Modul Siswa</h2>
                    <div className="grid gap-6">
                      {localStudentDocs.map((item, idx) => (
                        <div key={item.id} className="bg-slate-800/40 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-all space-y-5">
                           
                           {/* Header & Single Image */}
                           <div className="flex flex-col md:flex-row gap-4 items-start">
                               <div className="w-20 h-20 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group border border-white/5">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Image size={24}/></div>
                                  )}
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    title="Upload Foto Utama"
                                    onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                    onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                        setLocalStudentDocs(prev => {
                                            const newDocs = [...prev];
                                            newDocs[idx] = { ...newDocs[idx], imageUrl: url };
                                            return newDocs;
                                        });
                                    }, `stu-${item.id}`)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" 
                                  />
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                     <Image size={18} className="text-white" />
                                  </div>
                                  {uploadingState.isUploading && uploadingState.id === `stu-${item.id}` && (
                                     <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                        <Loader2 className="animate-spin text-white w-6 h-6" />
                                     </div>
                                  )}
                               </div>
                               
                               <div className="flex-1 w-full">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">Judul Modul</label>
                                    <input 
                                        value={item.title}
                                        onChange={(e) => {
                                            const newDocs = [...localStudentDocs];
                                            newDocs[idx].title = e.target.value;
                                            setLocalStudentDocs(newDocs);
                                        }}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-secondary transition-colors"
                                    />
                               </div>

                               <button 
                                  onClick={() => handleSaveDoc(item.id, 'student')} 
                                  className="h-10 px-4 mt-auto flex items-center justify-center bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors font-bold text-sm"
                               >
                                  <Save size={16} className="mr-2"/> Simpan
                               </button>
                           </div>

                           {/* Gallery / Slide Section */}
                           <div className="bg-slate-950/30 rounded-lg p-4 border border-white/5">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    <Images size={14} /> Galeri Slide Motion ({item.gallery?.length || 0})
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {/* Existing Images */}
                                    {item.gallery?.map((img, imgIdx) => (
                                        <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeFromGallery(item.id, imgIdx, 'student')}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {/* Add Button */}
                                    <div className="relative aspect-square bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-secondary transition-colors group cursor-pointer">
                                         {uploadingState.isUploading && uploadingState.id === `stu-gal-${item.id}` ? (
                                             <Loader2 className="animate-spin text-secondary" size={20} />
                                         ) : (
                                             <Plus className="text-slate-500 group-hover:text-secondary" size={20} />
                                         )}
                                         <input 
                                            type="file" 
                                            accept="image/*"
                                            onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                            onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                                addToGallery(url, item.id, 'student');
                                            }, `stu-gal-${item.id}`)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                         />
                                    </div>
                                </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Admin Docs */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-white/5 pb-2">Modul Admin</h2>
                    <div className="grid gap-6">
                      {localAdminDocs.map((item, idx) => (
                        <div key={item.id} className="bg-slate-800/40 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-all space-y-5">
                           
                           {/* Header & Single Image */}
                           <div className="flex flex-col md:flex-row gap-4 items-start">
                               <div className="w-20 h-20 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group border border-white/5">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600"><Image size={24}/></div>
                                  )}
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    title="Upload Foto Utama"
                                    onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                    onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                        setLocalAdminDocs(prev => {
                                            const newDocs = [...prev];
                                            newDocs[idx] = { ...newDocs[idx], imageUrl: url };
                                            return newDocs;
                                        });
                                    }, `adm-${item.id}`)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" 
                                  />
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                     <Image size={18} className="text-white" />
                                  </div>
                                  {uploadingState.isUploading && uploadingState.id === `adm-${item.id}` && (
                                     <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                        <Loader2 className="animate-spin text-white w-6 h-6" />
                                     </div>
                                  )}
                               </div>
                               
                               <div className="flex-1 w-full">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1 block">Judul Modul</label>
                                    <input 
                                        value={item.title}
                                        onChange={(e) => {
                                            const newDocs = [...localAdminDocs];
                                            newDocs[idx].title = e.target.value;
                                            setLocalAdminDocs(newDocs);
                                        }}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-secondary transition-colors"
                                    />
                               </div>

                               <button 
                                  onClick={() => handleSaveDoc(item.id, 'admin')} 
                                  className="h-10 px-4 mt-auto flex items-center justify-center bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors font-bold text-sm"
                               >
                                  <Save size={16} className="mr-2"/> Simpan
                               </button>
                           </div>

                           {/* Gallery / Slide Section */}
                           <div className="bg-slate-950/30 rounded-lg p-4 border border-white/5">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    <Images size={14} /> Galeri Slide Motion ({item.gallery?.length || 0})
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {/* Existing Images */}
                                    {item.gallery?.map((img, imgIdx) => (
                                        <div key={imgIdx} className="relative aspect-square rounded-lg overflow-hidden group border border-white/10">
                                            <img src={img} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => removeFromGallery(item.id, imgIdx, 'admin')}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    {/* Add Button */}
                                    <div className="relative aspect-square bg-white/5 border border-dashed border-white/20 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-secondary transition-colors group cursor-pointer">
                                         {uploadingState.isUploading && uploadingState.id === `adm-gal-${item.id}` ? (
                                             <Loader2 className="animate-spin text-secondary" size={20} />
                                         ) : (
                                             <Plus className="text-slate-500 group-hover:text-secondary" size={20} />
                                         )}
                                         <input 
                                            type="file" 
                                            accept="image/*"
                                            onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                            onChange={(e) => handleFileUpload(e, 'docs', (url) => {
                                                addToGallery(url, item.id, 'admin');
                                            }, `adm-gal-${item.id}`)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                         />
                                    </div>
                                </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            )}

            {/* PRICING */}
            {activeTab === 'pricing' && (
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-2xl font-bold text-white mb-6">Edit Paket Harga</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {localPricing.map((plan, idx) => (
                      <div key={idx} className="bg-slate-800/40 p-8 rounded-3xl border border-white/5 space-y-5 hover:bg-slate-800/60 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-secondary mb-2">
                           <CreditCard size={24} />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Nama Paket</label>
                          <input 
                            value={plan.name}
                            onChange={(e) => {
                                const newPricing = [...localPricing];
                                newPricing[idx].name = e.target.value;
                                setLocalPricing(newPricing);
                            }}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white font-semibold mt-1"
                          />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Harga</label>
                            <input 
                                value={plan.price}
                                onChange={(e) => {
                                    const newPricing = [...localPricing];
                                    newPricing[idx].price = e.target.value;
                                    setLocalPricing(newPricing);
                                }}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white font-bold mt-1"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Periode</label>
                            <input 
                                value={plan.period}
                                onChange={(e) => {
                                    const newPricing = [...localPricing];
                                    newPricing[idx].period = e.target.value;
                                    setLocalPricing(newPricing);
                                }}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm mt-1"
                            />
                          </div>
                        </div>
                        <button 
                           onClick={() => handleSavePricing(idx)}
                           className="w-full bg-white/5 hover:bg-green-600 hover:text-white text-slate-300 py-3 rounded-xl font-bold flex items-center justify-center mt-4 transition-all border border-white/5 hover:border-transparent"
                        >
                           <Save size={16} className="mr-2" /> Simpan Paket Ini
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
            )}
            
            {/* CONTACT */}
            {activeTab === 'contact' && (
                <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-6">
                    {localContacts.map((contact, idx) => (
                      <div key={contact.id} className="bg-slate-800/40 p-8 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                        <div className="flex items-center justify-between">
                           <h2 className="text-xl font-bold text-white">Kontak {idx === 0 ? 'Admin' : 'Marketing'}</h2>
                           <button 
                             onClick={() => handleSaveContact(contact.id)}
                             className="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg font-bold flex items-center text-sm transition-colors"
                           >
                             <Save size={16} className="mr-2" /> Simpan
                           </button>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex justify-center mb-4">
                              <div className="relative group">
                                 <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
                                    {uploadingState.isUploading && uploadingState.id === `contact_img_${contact.id}` ? (
                                       <Loader2 className="animate-spin text-white" />
                                    ) : contact.imageUrl ? (
                                       <img src={contact.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                       <User size={32} className="text-slate-700" />
                                    )}
                                 </div>
                                 <input 
                                    type="file"
                                    title="Upload Foto"
                                    onChange={(e) => handleFileUpload(e, 'contacts', (url) => {
                                       const newContacts = [...localContacts];
                                       newContacts[idx].imageUrl = url;
                                       setLocalContacts(newContacts);
                                    }, `contact_img_${contact.id}`)}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                 />
                                 <div className="absolute -bottom-2 -right-2 bg-secondary p-2 rounded-lg text-white shadow-lg pointer-events-none">
                                    <Upload size={14} />
                                 </div>
                              </div>
                           </div>

                           <div>
                             <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Nama Lengkap</label>
                             <input 
                               value={contact.name}
                               onChange={(e) => {
                                  const newContacts = [...localContacts];
                                  newContacts[idx].name = e.target.value;
                                  setLocalContacts(newContacts);
                               }}
                               className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-secondary transition-colors"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Jabatan / Role</label>
                             <input 
                               value={contact.role}
                               onChange={(e) => {
                                  const newContacts = [...localContacts];
                                  newContacts[idx].role = e.target.value;
                                  setLocalContacts(newContacts);
                               }}
                               className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-secondary transition-colors"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold uppercase text-slate-500 mb-2 ml-1">Nomor WhatsApp</label>
                             <input 
                               value={contact.phone}
                               onChange={(e) => {
                                  const newContacts = [...localContacts];
                                  newContacts[idx].phone = e.target.value;
                                  setLocalContacts(newContacts);
                               }}
                               className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:border-secondary transition-colors"
                               placeholder="Contoh: 0821-xxxx-xxxx"
                             />
                             <p className="text-[10px] text-slate-500 mt-2 ml-1">*Nomor ini akan digunakan untuk link WA otomatis.</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            )}

            {/* CLIENTS */}
            {activeTab === 'clients' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Clients & Partners</h2>
                    <button 
                      onClick={() => setIsAddingClient(true)}
                      className="bg-secondary hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-bold shadow-lg shadow-blue-500/20"
                    >
                      <Plus size={16} className="mr-2" /> Tambah Client
                    </button>
                  </div>
                  
                  {isAddingClient && (
                     <div className="bg-slate-800/60 p-6 rounded-2xl border border-white/10 animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                        <h3 className="text-lg font-bold text-white mb-6">Tambah Client Baru</h3>
                        <form onSubmit={handleAddClient} className="space-y-6">
                           <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Nama Sekolah / Instansi</label>
                                 <input 
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary"
                                    placeholder="Misal: SMA Negeri 1 Jakarta"
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Upload Logo</label>
                                 <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-slate-950 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden relative group hover:border-white/20 transition-colors">
                                       {uploadingState.isUploading && uploadingState.id === 'new_client_logo' ? (
                                          <Loader2 className="animate-spin text-white" />
                                       ) : newClientLogo ? (
                                          <img src={newClientLogo} alt="Preview" className="w-full h-full object-contain p-2" />
                                       ) : (
                                          <div className="text-center text-slate-600 text-xs font-medium">
                                             <Upload size={20} className="mx-auto mb-2 opacity-50" />
                                             Upload
                                          </div>
                                       )}
                                       <input 
                                          type="file"
                                          title="Upload Foto"
                                          onChange={(e) => handleFileUpload(e, 'clients', setNewClientLogo, 'new_client_logo')}
                                          className="absolute inset-0 opacity-0 cursor-pointer z-30"
                                          onClick={(e) => (e.target as HTMLInputElement).value = ''}
                                       />
                                       {uploadingState.isUploading && uploadingState.id === 'new_client_logo' && (
                                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                                                <Loader2 className="animate-spin text-white w-6 h-6" />
                                            </div>
                                       )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                       Format: PNG/JPG. <br/> Background transparan disarankan.
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="flex justify-end gap-3 pt-2">
                              <button 
                                 type="button" 
                                 onClick={() => setIsAddingClient(false)}
                                 className="px-6 py-2.5 text-slate-400 hover:text-white font-medium"
                              >
                                 Batal
                              </button>
                              <button 
                                 type="submit"
                                 className="bg-green-600 hover:bg-green-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-green-900/20"
                              >
                                 Simpan
                              </button>
                           </div>
                        </form>
                     </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                     {clients.map((client) => (
                        <div key={client.id} className="bg-slate-800/30 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-3 group hover:bg-slate-800/50 transition-colors relative">
                           <div className="w-full h-24 bg-black/20 rounded-lg p-4 flex items-center justify-center">
                                 <img src={client.logoUrl} alt={client.name} className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
                           </div>
                           <span className="font-medium text-white text-sm line-clamp-2 min-h-[2.5em]">{client.name}</span>
                           <button 
                              type="button"
                              onClick={() => {
                                 if(window.confirm('Hapus client ini?')) deleteClient(client.id);
                              }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform scale-90 group-hover:scale-100"
                              title="Hapus"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>
                     ))}
                  </div>
                </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
