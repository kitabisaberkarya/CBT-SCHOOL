
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Feature, DocItem, PricingPlan } from '../types';
import { 
  FEATURES_DATA, 
  STUDENT_MODULE_DOCS, 
  ADMIN_MODULE_DOCS, 
  INITIAL_HERO_IMAGE,
  PRICING_DATA,
  COMPANY_CONTACT
} from '../constants';

interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
}

interface ContactInfo {
  name: string;
  role: string;
  phone: string;
  whatsappUrl: string;
}

interface ContentContextType {
  loading: boolean;
  // Hero
  heroImage: string;
  setHeroImage: (url: string) => void;
  heroContent: HeroContent;
  setHeroContent: (content: HeroContent) => void;
  
  // Features & Docs
  features: Feature[];
  updateFeature: (id: string, updates: Partial<Feature>) => void;
  studentDocs: DocItem[];
  updateStudentDoc: (id: string, updates: Partial<DocItem>) => void;
  adminDocs: DocItem[];
  updateAdminDoc: (id: string, updates: Partial<DocItem>) => void;
  
  // Pricing
  pricingPlans: PricingPlan[];
  updatePricingPlan: (index: number, updates: Partial<PricingPlan>) => void;
  
  // Contact
  contactInfo: ContactInfo;
  updateContactInfo: (updates: Partial<ContactInfo>) => void;

  // System
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // 1. Hero Section
  const [heroImage, setHeroImageState] = useState(INITIAL_HERO_IMAGE);
  const [heroContent, setHeroContentState] = useState<HeroContent>({
    title: "CBT SCHOOL",
    subtitle: "Hemat, Aman, Berintegritas",
    description: "Transformasi sistem evaluasi sekolah Anda dengan platform ujian digital berbasis web yang modern.",
    ctaText: "Lihat Penawaran"
  });

  // 2. Features & Docs
  const [features, setFeatures] = useState<Feature[]>(FEATURES_DATA);
  const [studentDocs, setStudentDocs] = useState<DocItem[]>(STUDENT_MODULE_DOCS);
  const [adminDocs, setAdminDocs] = useState<DocItem[]>(ADMIN_MODULE_DOCS);

  // 3. Pricing
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(PRICING_DATA);

  // 4. Contact
  const [contactInfo, setContactInfoState] = useState<ContactInfo>(COMPANY_CONTACT);

  // --- FETCH DATA FROM SUPABASE ---
  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);

      // 1. Fetch Hero
      const { data: heroData } = await supabase.from('hero').select('*').single();
      if (heroData) {
        setHeroContentState({
          title: heroData.title,
          subtitle: heroData.subtitle,
          description: heroData.description,
          ctaText: heroData.cta_text
        });
        setHeroImageState(heroData.image_url);
      }

      // 2. Fetch Contact
      const { data: contactData } = await supabase.from('contact').select('*').single();
      if (contactData) {
        setContactInfoState({
          name: contactData.name,
          role: contactData.role,
          phone: contactData.phone,
          whatsappUrl: generateWaUrl(contactData.phone)
        });
      }

      // 3. Fetch Features
      const { data: featuresData } = await supabase.from('features').select('*');
      if (featuresData && featuresData.length > 0) {
        setFeatures(prev => prev.map(item => {
          const dbItem = featuresData.find((f: any) => f.id === item.id);
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url } : item;
        }));
      }

      // 4. Fetch Docs
      const { data: docsData } = await supabase.from('docs').select('*');
      if (docsData && docsData.length > 0) {
        setStudentDocs(prev => prev.map(item => {
          const dbItem = docsData.find((d: any) => d.id === item.id);
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url } : item;
        }));
        setAdminDocs(prev => prev.map(item => {
          const dbItem = docsData.find((d: any) => d.id === item.id);
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url } : item;
        }));
      }

      // 5. Fetch Pricing
      const { data: pricingData } = await supabase.from('pricing').select('*').order('id', { ascending: true });
      if (pricingData && pricingData.length > 0) {
        // Map DB data to local state structure
        // Note: Features list in pricing is usually JSON in DB or array
        setPricingPlans(prev => prev.map((plan, idx) => {
          const dbPlan = pricingData[idx]; // Assuming order matches
          if (!dbPlan) return plan;
          return {
            ...plan,
            name: dbPlan.name,
            price: dbPlan.price,
            period: dbPlan.period,
            // Assuming features inside pricing are kept hardcoded or stored as JSONB in advanced setup.
            // For this simple migration, we trust the DB price/name but keep structure.
          };
        }));
      }

    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const generateWaUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${waNumber}`;
  };

  // --- UPDATERS (Write to Supabase) ---

  const setHeroImage = async (url: string) => {
    setHeroImageState(url);
    await supabase.from('hero').update({ image_url: url }).eq('id', 1);
  };

  const setHeroContent = async (content: HeroContent) => {
    setHeroContentState(content);
    await supabase.from('hero').update({
      title: content.title,
      subtitle: content.subtitle,
      description: content.description,
      cta_text: content.ctaText
    }).eq('id', 1);
  };

  const updateFeature = async (id: string, updates: Partial<Feature>) => {
    // Optimistic Update
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    
    // DB Update
    const dbPayload: any = {};
    if (updates.title) dbPayload.title = updates.title;
    if (updates.description) dbPayload.description = updates.description;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;

    await supabase.from('features').update(dbPayload).eq('id', id);
  };

  const updateStudentDoc = async (id: string, updates: Partial<DocItem>) => {
    setStudentDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const dbPayload: any = {};
    if (updates.title) dbPayload.title = updates.title;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;
    // Note: 'points' array is harder to sync in simple table structure, keeping it static or needs JSONB column

    await supabase.from('docs').update(dbPayload).eq('id', id);
  };

  const updateAdminDoc = async (id: string, updates: Partial<DocItem>) => {
    setAdminDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const dbPayload: any = {};
    if (updates.title) dbPayload.title = updates.title;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;

    await supabase.from('docs').update(dbPayload).eq('id', id);
  };

  const updatePricingPlan = async (index: number, updates: Partial<PricingPlan>) => {
    setPricingPlans(prev => {
      const newPlans = [...prev];
      newPlans[index] = { ...newPlans[index], ...updates };
      return newPlans;
    });

    // Assume ID 1 and 2 for the two plans
    const dbId = index + 1; 
    const dbPayload: any = {};
    if (updates.name) dbPayload.name = updates.name;
    if (updates.price) dbPayload.price = updates.price;
    if (updates.period) dbPayload.period = updates.period;

    await supabase.from('pricing').update(dbPayload).eq('id', dbId);
  };

  const updateContactInfo = async (updates: Partial<ContactInfo>) => {
    let newInfo = { ...contactInfo, ...updates };
    if (updates.phone) {
      newInfo.whatsappUrl = generateWaUrl(updates.phone);
    }
    setContactInfoState(newInfo);

    await supabase.from('contact').update({
      name: newInfo.name,
      role: newInfo.role,
      phone: newInfo.phone
    }).eq('id', 1);
  };

  return (
    <ContentContext.Provider value={{
      loading,
      heroImage, setHeroImage,
      heroContent, setHeroContent,
      features, updateFeature,
      studentDocs, updateStudentDoc,
      adminDocs, updateAdminDoc,
      pricingPlans, updatePricingPlan,
      contactInfo, updateContactInfo,
      isAdminOpen, setIsAdminOpen
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
