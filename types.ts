import { LucideIcon } from 'lucide-react';

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  imageUrl?: string;
}

export interface DocItem {
  id: string;
  title: string;
  icon: LucideIcon;
  points: string[];
  imageUrl?: string;
  gallery?: string[]; // Added for slideshow support
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  isRecommended: boolean;
  ctaText: string;
  type: 'sewa' | 'beli';
}

export interface ComparisonRow {
  aspect: string;
  sewa: string;
  beli: string;
}

export interface Client {
  id: number;
  name: string;
  logoUrl: string;
}

export interface ContactInfo {
  id: string;
  name: string;
  role: string;
  phone: string;
  whatsappUrl: string;
  imageUrl?: string;
}