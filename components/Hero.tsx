
import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronRight, Users, PlayCircle } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';

const Hero: React.FC = () => {
  const { heroImage, heroImage2, heroImage3, heroVideo, heroContent } = useContent();
  const { t, language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Content Selection: Use Context (Database) for ID, use Translation for EN
  const displayContent = language === 'id' ? heroContent : {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    description: t('hero.description'),
    ctaText: t('hero.cta_primary')
  };

  // Daftar gambar untuk slider
  const sliderImages = [
    heroImage, 
    heroImage2, 
    heroImage3
  ];

  // Auto-play logic (Only if video is NOT showing)
  useEffect(() => {
    if (heroVideo) return; // Disable slider interval if video exists
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4000); 

    return () => clearInterval(timer);
  }, [sliderImages.length, heroVideo]);

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50 dark:bg-dark transition-colors duration-300">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-accent/10 dark:bg-accent/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Content (Text) */}
          <div className="w-full lg:w-1/2 text-center lg:text-left" data-aos="fade-right" data-aos-duration="1000">
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-secondary/30 bg-secondary/10 text-secondary mb-6">
              <span className="flex h-2 w-2 rounded-full bg-secondary mr-2 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider uppercase">{t('hero.tag')}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              {displayContent.title} <br />
              <span className="text-gradient">{displayContent.subtitle}</span>
            </h1>
            
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {displayContent.description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a 
                href="#pricing" 
                className="group bg-secondary hover:bg-blue-600 text-white px-8 py-4 rounded-full font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center"
              >
                {displayContent.ctaText}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#contact" 
                className="group glass-card hover:bg-secondary/10 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/20 px-8 py-4 rounded-full font-semibold transition-all flex items-center justify-center"
              >
                {t('hero.cta_secondary')}
                <ChevronRight className="ml-2 w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
              </a>
            </div>
          </div>

          {/* Right Content: Video OR 3D Animated Image Slider */}
          <div className="w-full lg:w-1/2" data-aos="fade-left" data-aos-duration="1200">
            <div className="relative rounded-2xl p-2 glass-card border border-white/10 shadow-2xl animate-[float_6s_ease-in-out_infinite]">
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 to-transparent rounded-2xl blur-xl -z-10"></div>
              
              {heroVideo ? (
                // --- VIDEO PLAYER MODE ---
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
                  <video 
                    key={heroVideo} // Force re-render when video URL changes
                    src={heroVideo} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline // Critical for mobile auto-play
                    controls
                    className="w-full h-full object-cover"
                  />
                  {/* Optional Overlay when paused or initial load aesthetics */}
                  <div className="absolute top-4 right-4 z-20 pointer-events-none">
                    <div className="bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-lg animate-pulse">
                      <PlayCircle size={14} className="mr-1" /> LIVE DEMO
                    </div>
                  </div>
                </div>
              ) : (
                // --- 3D SLIDER MODE ---
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 perspective-[1000px] group">
                   {sliderImages.map((img, index) => (
                     <div 
                      key={index}
                      className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
                        index === currentSlide 
                          ? 'opacity-100 scale-100 rotate-0 z-20' 
                          : 'opacity-0 scale-110 rotate-3 z-10'
                      }`}
                      style={{
                        transformOrigin: 'center center',
                        transform: index === currentSlide 
                          ? 'translate3d(0,0,0) rotateX(0)' 
                          : 'translate3d(0, 20px, -50px) rotateX(5deg)'
                      }}
                     >
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent z-10"></div>
                       <img 
                        src={img}
                        alt={`Slide ${index + 1}`} 
                        className="w-full h-full object-cover shadow-inner"
                      />
                     </div>
                   ))}

                   <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
                      {sliderImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            currentSlide === idx 
                              ? 'w-8 bg-secondary shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                              : 'bg-white/30 hover:bg-white/60'
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                   </div>
                </div>
              )}
              
              {/* Floating Badge Left (System Status) */}
              <div className="absolute -bottom-6 -left-6 glass-header p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl hidden md:block z-40 transform transition-transform hover:scale-105 duration-300">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('hero.system_status')}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{t('hero.online_secure')}</p>
                  </div>
                </div>
              </div>

              {/* Floating Badge Right (Server Capacity) */}
              <div className="absolute -bottom-6 -right-6 glass-header p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl hidden md:block z-40 transform transition-transform hover:scale-105 duration-300">
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                  <div className="bg-secondary/20 p-2 rounded-full relative">
                    <Users className="w-4 h-4 text-secondary" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-900"></span>
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('hero.server_cap')}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">5.000+ {t('hero.students')}</p>
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

export default Hero;
