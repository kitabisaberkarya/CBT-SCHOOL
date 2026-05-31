import React from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { PRICING_EN } from '../data/translations';
import { Check } from 'lucide-react';
import { PricingPlan } from '../types';

const Pricing: React.FC = () => {
  const { pricingPlans: pricingPlansID, contacts } = useContent();
  const { t, language } = useLanguage();
  const adminContact = contacts[0];

  const pricingPlans = language === 'id' ? pricingPlansID : PRICING_EN;

  const generateWaLink = (plan: PricingPlan) => {
    // Extract numbers only from the dynamic phone number in context
    const cleanPhone = adminContact.phone.replace(/\D/g, '');
    const phoneNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    
    // Professional message template in ID
    let message = `Halo Admin CBT School,

Saya tertarik untuk mengetahui lebih lanjut mengenai layanan CBT School untuk paket:
*${plan.name}*

Mohon informasi mengenai penawaran harga terbaik dan detail implementasinya.
Terima kasih.`;

    if (language === 'en') {
        message = `Hello CBT School Admin,

I am interested in learning more about CBT School services for the package:
*${plan.name}*

Please provide information regarding the best price offer and implementation details.
Thank you.`;
    }

    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <section id="pricing" className="py-24 bg-slate-50 dark:bg-dark relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('pricing.title_prefix')} <span className="text-gradient">{t('pricing.title_suffix')}</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('pricing.desc')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {pricingPlans?.map((plan, index) => (
            <div 
              key={index}
              data-aos="flip-left"
              data-aos-delay={index * 200}
              className={`relative rounded-3xl p-8 border transition-all duration-300 ${
                plan.isRecommended 
                  ? 'bg-gradient-to-b from-white to-slate-50 dark:from-primary/20 dark:to-dark border-secondary shadow-2xl shadow-blue-500/10 dark:shadow-blue-900/20' 
                  : 'glass-card border-slate-200 dark:border-white/10'
              } flex flex-col h-full`}
            >
              {plan.isRecommended && (
                <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
                  {t('pricing.rec_badge')}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">{plan.name}</h3>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-slate-500 mt-1 text-sm">{plan.period}</span>
                </div>
              </div>

              <div className="flex-grow space-y-4 mb-8">
                {plan.features?.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center mt-0.5">
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                    </div>
                    <span className="ml-3 text-slate-700 dark:text-slate-300 text-sm leading-6">{feature}</span>
                  </div>
                ))}
              </div>

              <a 
                href={generateWaLink(plan)}
                target="_blank"
                rel="noreferrer"
                className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
                  plan.isRecommended
                    ? 'bg-secondary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-transparent dark:border-white/20'
                }`}
              >
                {plan.ctaText}
              </a>
            </div>
          ))}
        </div>

        {/* Demo License Note */}
        <div className="mt-12 max-w-3xl mx-auto text-center" data-aos="fade-up">
          <div className="inline-block p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
            <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base">
              {language === 'id' ? (
                <>
                  Bagi sekolah, instansi, dan lembaga yang ingin mencoba semua fitur di aplikasi CBT School ini bisa memasukkan lisensi demo nya: <span className="font-bold text-secondary dark:text-blue-400 select-all">CBT-SCHOOL-DEMO</span>
                </>
              ) : (
                <>
                  For schools, institutions, and agencies that want to try all features in this CBT School application, you can enter the demo license: <span className="font-bold text-secondary dark:text-blue-400 select-all">CBT-SCHOOL-DEMO</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;