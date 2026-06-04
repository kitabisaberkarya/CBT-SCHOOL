import React from 'react';
import { MessageCircle, ArrowRight, Bell, Users, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WhatsAppChannel: React.FC = () => {
  const { language } = useLanguage();
  const channelUrl = "https://whatsapp.com/channel/0029Vb7MKceHltY68fJhoe22";

  const content = {
    id: {
      title: "Gabung Saluran WhatsApp",
      subtitle: "Update Tercepat & Eksklusif",
      desc: "Dapatkan informasi terbaru seputar update fitur, tips penggunaan, dan promo eksklusif langsung di WhatsApp Anda. Jadilah yang pertama tahu!",
      btn: "Gabung Saluran Sekarang",
      features: [
        "Update Fitur Terbaru",
        "Tips & Trik Proktor",
        "Info Maintenance",
        "Komunitas Terpercaya"
      ],
      stats: "1.2k+ Pengikut"
    },
    en: {
      title: "Join WhatsApp Channel",
      subtitle: "Fastest & Exclusive Updates",
      desc: "Get the latest information about feature updates, usage tips, and exclusive promos directly on your WhatsApp. Be the first to know!",
      btn: "Join Channel Now",
      features: [
        "Latest Feature Updates",
        "Proctor Tips & Tricks",
        "Maintenance Info",
        "Trusted Community"
      ],
      stats: "1.2k+ Followers"
    }
  };

  const c = language === 'id' ? content.id : content.en;

  return (
    <section id="wa-channel" className="py-16 relative overflow-hidden bg-white dark:bg-dark transition-colors duration-300">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#25D366] blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary blur-[120px] rounded-full animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto" data-aos="fade-up">
          <div className="relative group">
            {/* Decorative Border Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-secondary rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative glass-card rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row shadow-2xl">
              {/* Left Content */}
              <div className="p-8 md:p-12 lg:w-3/5 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-bold mb-6 w-fit">
                  <Bell size={16} className="animate-bounce" />
                  <span>{c.subtitle}</span>
                </div>
                
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
                  {c.title} <span className="text-[#25D366]">CBT SCHOOL</span>
                </h2>
                
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  {c.desc}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {c.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                      <div className="bg-green-500/20 p-1 rounded-full">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <a 
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto group bg-[#25D366] hover:bg-[#20bd5a] text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-green-500/30 flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
                  >
                    <img 
                      src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
                      alt="WA" 
                      className="w-6 h-6 object-contain brightness-0 invert"
                    />
                    {c.btn}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-200 dark:bg-slate-700">
                          <img 
                            src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                            alt="User" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm">
                      <p className="font-bold text-slate-900 dark:text-white">{c.stats}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Telah bergabung</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Visual */}
              <div className="lg:w-2/5 bg-gradient-to-br from-[#25D366]/10 to-secondary/10 p-12 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <MessageCircle size={400} className="text-[#25D366]" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500 border border-slate-100 dark:border-white/5">
                    <img 
                      src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1764734104/logo-whatsapp-png-46041_bszwhg.png" 
                      alt="WhatsApp Logo" 
                      className="w-20 h-20 md:w-32 md:h-32 object-contain"
                    />
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-xl -rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-2 text-[#25D366] font-bold">
                      <Users size={18} />
                      <span>Saluran Resmi</span>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-10 right-10 animate-bounce delay-700">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg">
                    <Bell size={20} className="text-yellow-500" />
                  </div>
                </div>
                <div className="absolute bottom-10 left-10 animate-bounce">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg">
                    <ShieldCheck size={20} className="text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppChannel;
