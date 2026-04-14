import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const { setIsAdminOpen } = useContent();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  
  // Secret Admin Trigger Logic
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navLinks = [
    { name: t('nav.features'), href: '#features' },
    { name: t('nav.docs'), href: '#docs' },
    { name: t('nav.download'), href: '#downloads' },
    { name: language === 'id' ? 'AKTIVASI ONLINE' : 'GO ONLINE', href: '#online-guide' },
    { name: t('nav.details'), href: '#details' },
    { name: t('nav.pricing'), href: '#pricing' },
    { name: t('nav.contact'), href: '#contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Scroll Spy Logic
      const scrollPosition = window.scrollY + 150;

      let current = '';
      navLinks.forEach((link) => {
        const section = document.querySelector(link.href) as HTMLElement;
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          
          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = link.href;
          }
        }
      });

      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
        current = '#contact';
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [t]); // Re-run if language changes to update Spy references

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    setActiveSection(href);

    const targetElement = document.querySelector(href) as HTMLElement;
    if (targetElement) {
      const headerOffset = 90;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveSection('');
  };

  // Logic 5x Klik untuk Admin
  const handleLogoClick = () => {
    // Increment click count
    setClickCount((prev) => {
      const newCount = prev + 1;
      
      // Jika mencapai 5 klik
      if (newCount === 5) {
        setIsAdminOpen(true);
        return 0; // Reset counter
      }
      return newCount;
    });

    // Reset counter jika user berhenti mengklik selama 1 detik
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 1000); // 1 detik timeout

    // Scroll to top functionality tetep jalan
    scrollToTop();
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-header py-4 shadow-lg' : 'bg-transparent py-6'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          
          {/* Logo dengan Secret Trigger */}
          <div className="flex items-center cursor-pointer select-none" onClick={handleLogoClick}>
            <img 
              src="https://res.cloudinary.com/dt1nrarpq/image/upload/v1760191403/unnamed_2_t2vtqg.png" 
              alt="Logo CBT School" 
              className="h-10 w-auto mr-3 object-contain"
            />
            <span className="text-2xl font-bold tracking-wide text-slate-800 dark:text-white transition-colors">CBT <span className="text-secondary">SCHOOL</span></span>
          </div>
          
          <div className="hidden md:flex space-x-6 items-center">
            {navLinks.map((link) => (
              <a 
                key={link.href} 
                href={link.href} 
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-sm font-medium uppercase tracking-wider transition-all duration-300 relative group ${
                  activeSection === link.href 
                    ? 'text-secondary' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-secondary dark:hover:text-white'
                }`}
              >
                {link.name}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-secondary transition-all duration-300 ${
                  activeSection === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </a>
            ))}
            
            {/* Divider */}
            <div className="h-6 w-px bg-slate-300 dark:bg-white/10 mx-2"></div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <a 
              href="#pricing" 
              onClick={(e) => handleNavClick(e, '#pricing')}
              className="bg-secondary hover:bg-blue-600 text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5"
            >
              {t('nav.offer')}
            </a>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-800 dark:text-white hover:text-secondary transition-colors">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass-header absolute w-full pb-6 pt-2 px-4 flex flex-col space-y-4 shadow-xl border-t border-slate-200 dark:border-white/10">
          {navLinks.map((link) => (
            <a 
              key={link.href} 
              href={link.href} 
              onClick={(e) => handleNavClick(e, link.href)}
              className={`block py-2 text-base font-medium transition-colors border-l-2 pl-3 ${
                activeSection === link.href 
                  ? 'text-secondary border-secondary bg-secondary/5' 
                  : 'text-slate-600 dark:text-slate-300 border-transparent hover:text-secondary hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {link.name}
            </a>
          ))}
          <a 
            href="#pricing"
            onClick={(e) => handleNavClick(e, '#pricing')}
            className="bg-secondary text-center text-white block px-5 py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors"
          >
            {t('nav.viewOffer')}
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;