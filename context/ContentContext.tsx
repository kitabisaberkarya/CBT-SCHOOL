
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Feature, DocItem, PricingPlan, Client, ContactInfo } from '../types';
import { 
  FEATURES_DATA, 
  STUDENT_MODULE_DOCS, 
  ADMIN_MODULE_DOCS, 
  INITIAL_HERO_IMAGE,
  PRICING_DATA,
  NETWORK_DOCS,
  COMPANY_CONTACTS,
  CLIENTS_DATA
} from '../constants';

interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
}

interface ContentContextType {
  loading: boolean;
  // Hero
  heroImage: string;
  setHeroImage: (url: string) => void;
  heroImage2: string;
  setHeroImage2: (url: string) => void;
  heroImage3: string;
  setHeroImage3: (url: string) => void;
  heroVideo: string;
  setHeroVideo: (url: string) => void;
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
  
  // Network
  networkDocs: DocItem[];
  updateNetworkDoc: (id: string, updates: Partial<DocItem>) => void;
  
  // Contact
  contacts: ContactInfo[];
  updateContact: (id: string, updates: Partial<ContactInfo>) => void;

  // Clients
  clients: Client[];
  addClient: (name: string, logoUrl: string) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;

  // System
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  uploadImage: (file: File, folder: string) => Promise<string | null>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // 1. Hero Section
  const [heroImage, setHeroImageState] = useState(INITIAL_HERO_IMAGE);
  const [heroImage2, setHeroImage2State] = useState("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1742&auto=format&fit=crop");
  const [heroImage3, setHeroImage3State] = useState("https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1740&auto=format&fit=crop");
  const [heroVideo, setHeroVideoState] = useState("");

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
  const [networkDocs, setNetworkDocs] = useState<DocItem[]>(NETWORK_DOCS);

  // 3. Pricing
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(PRICING_DATA);

  // 4. Contact
  const [contacts, setContacts] = useState<ContactInfo[]>(COMPANY_CONTACTS);

  // 5. Clients
  const [clients, setClients] = useState<Client[]>(CLIENTS_DATA);

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
        if (heroData.image_url_2) setHeroImage2State(heroData.image_url_2);
        if (heroData.image_url_3) setHeroImage3State(heroData.image_url_3);
        // Ensure null fallback to empty string
        setHeroVideoState(heroData.video_url || "");
      }

      // 2. Fetch Contact
      const { data: contactData } = await supabase.from('contact').select('*').order('id', { ascending: true });
      if (contactData && contactData.length > 0) {
        setContacts(prev => prev.map((item, idx) => {
          const dbItem = contactData[idx];
          if (!dbItem) return item;
          return {
            ...item,
            name: dbItem.name,
            role: dbItem.role,
            phone: dbItem.phone,
            whatsappUrl: generateWaUrl(dbItem.phone),
            imageUrl: dbItem.image_url || item.imageUrl
          };
        }));
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
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url, gallery: dbItem.gallery || [] } : item;
        }));
        setAdminDocs(prev => prev.map(item => {
          const dbItem = docsData.find((d: any) => d.id === item.id);
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url, gallery: dbItem.gallery || [] } : item;
        }));
        setNetworkDocs(prev => prev.map(item => {
          const dbItem = docsData.find((d: any) => d.id === item.id);
          return dbItem ? { ...item, ...dbItem, imageUrl: dbItem.image_url, gallery: dbItem.gallery || [] } : item;
        }));
      }

      // 5. Fetch Pricing
      const { data: pricingData } = await supabase.from('pricing').select('*').order('id', { ascending: true });
      if (pricingData && pricingData.length > 0) {
        setPricingPlans(prev => prev.map((plan, idx) => {
          const dbPlan = pricingData[idx]; // Assuming order matches
          if (!dbPlan) return plan;
          return {
            ...plan,
            name: dbPlan.name,
            price: dbPlan.price,
            period: dbPlan.period,
          };
        }));
      }

      // 6. Fetch Clients
      const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: true });
      if (clientsData && clientsData.length > 0) {
        setClients(clientsData.map((c: any) => ({
          id: c.id,
          name: c.name,
          logoUrl: c.logo_url
        })));
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

  const setHeroImage2 = async (url: string) => {
    setHeroImage2State(url);
    await supabase.from('hero').update({ image_url_2: url }).eq('id', 1);
  };

  const setHeroImage3 = async (url: string) => {
    setHeroImage3State(url);
    await supabase.from('hero').update({ image_url_3: url }).eq('id', 1);
  };

  const setHeroVideo = async (url: string) => {
    setHeroVideoState(url);
    // Explicitly handle empty string to save as NULL or empty string in DB
    const valueToSave = url === "" ? null : url;
    await supabase.from('hero').update({ video_url: valueToSave }).eq('id', 1);
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
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    
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
    if (updates.gallery) dbPayload.gallery = updates.gallery;

    await supabase.from('docs').update(dbPayload).eq('id', id);
  };

  const updateAdminDoc = async (id: string, updates: Partial<DocItem>) => {
    setAdminDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const dbPayload: any = {};
    if (updates.title) dbPayload.title = updates.title;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;
    if (updates.gallery) dbPayload.gallery = updates.gallery;

    await supabase.from('docs').update(dbPayload).eq('id', id);
  };

  const updateNetworkDoc = async (id: string, updates: Partial<DocItem>) => {
    setNetworkDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const dbPayload: any = {};
    if (updates.title) dbPayload.title = updates.title;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;
    if (updates.gallery) dbPayload.gallery = updates.gallery;

    await supabase.from('docs').update(dbPayload).eq('id', id);
  };

  const updatePricingPlan = async (index: number, updates: Partial<PricingPlan>) => {
    setPricingPlans(prev => {
      const newPlans = [...prev];
      newPlans[index] = { ...newPlans[index], ...updates };
      return newPlans;
    });

    const dbId = index + 1; 
    const dbPayload: any = {};
    if (updates.name) dbPayload.name = updates.name;
    if (updates.price) dbPayload.price = updates.price;
    if (updates.period) dbPayload.period = updates.period;

    await supabase.from('pricing').update(dbPayload).eq('id', dbId);
  };

  const updateContact = async (id: string, updates: Partial<ContactInfo>) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newInfo = { ...c, ...updates };
      if (updates.phone) {
        newInfo.whatsappUrl = generateWaUrl(updates.phone);
      }
      return newInfo;
    }));

    const dbPayload: any = {};
    if (updates.name) dbPayload.name = updates.name;
    if (updates.role) dbPayload.role = updates.role;
    if (updates.phone) dbPayload.phone = updates.phone;
    if (updates.imageUrl) dbPayload.image_url = updates.imageUrl;

    const dbId = parseInt(id.replace('c', ''));
    await supabase.from('contact').update(dbPayload).eq('id', dbId);
  };

  const addClient = async (name: string, logoUrl: string) => {
    const tempId = Date.now();
    const newClient: Client = { id: tempId, name, logoUrl };
    setClients(prev => [...prev, newClient]);

    const { data, error } = await supabase.from('clients').insert([{ name, logo_url: logoUrl }]).select().single();
    if (data && !error) {
        setClients(prev => prev.map(c => c.id === tempId ? { id: data.id, name: data.name, logoUrl: data.logo_url } : c));
    }
  };

  const deleteClient = async (id: number) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('clients').delete().eq('id', id);
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // FIX: Use 'cbt_assets' bucket instead of 'images'
        const { error: uploadError } = await supabase.storage
            .from('cbt_assets') 
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // FIX: Use 'cbt_assets' bucket
        const { data } = supabase.storage.from('cbt_assets').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error("Upload failed", error);
        return null;
    }
  };

  return (
    <ContentContext.Provider value={{
      loading,
      heroImage, setHeroImage,
      heroImage2, setHeroImage2,
      heroImage3, setHeroImage3,
      heroVideo, setHeroVideo,
      heroContent, setHeroContent,
      features, updateFeature,
      studentDocs, updateStudentDoc,
      adminDocs, updateAdminDoc,
      networkDocs, updateNetworkDoc,
      pricingPlans, updatePricingPlan,
      contacts, updateContact,
      clients, addClient, deleteClient,
      isAdminOpen, setIsAdminOpen,
      uploadImage
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
