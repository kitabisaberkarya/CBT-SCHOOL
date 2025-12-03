import React, { useEffect } from 'react';
import AOS from 'aos';
import { ContentProvider } from './context/ContentContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Clients from './components/Clients';
import FeatureDocs from './components/FeatureDocs';
import Details from './components/Details';
import Pricing from './components/Pricing';
import Comparison from './components/Comparison';
import CTA from './components/CTA';
import Contact from './components/Contact';
import Footer from './components/Footer';
import FloatingWA from './components/FloatingWA';
import AdminPanel from './components/AdminPanel';

function App() {
  useEffect(() => {
    AOS.init({
      once: true,
      easing: 'ease-out-cubic',
      duration: 800,
      offset: 50,
    });
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ContentProvider>
          <div className="font-sans bg-slate-50 dark:bg-dark min-h-screen text-slate-800 dark:text-slate-200 selection:bg-secondary selection:text-white transition-colors duration-300">
            <Navbar />
            
            <main>
              <Hero />
              {/* Menu: Fitur */}
              <Features />
              <Clients />
              {/* Menu: Dokumentasi */}
              <FeatureDocs />
              {/* Menu: Keunggulan (Why Choose Us) */}
              <Details />
              {/* Menu: Harga */}
              <Pricing />
              <Comparison />
              <CTA />
              {/* Menu: Kontak */}
              <Contact />
            </main>
            
            <Footer />
            <FloatingWA />
            <AdminPanel />
          </div>
        </ContentProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;