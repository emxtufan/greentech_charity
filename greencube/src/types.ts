export type Language = 'de' | 'en';

export interface FactItem {
  title: string;
  text: string;
  column?: 'Left' | 'Right';
}

export interface ApartmentItem {
  id: string;
  rooms: string;
  size: string;
  outdoor: string;
  price: string;
  status: 'Verfügbar' | 'Reserviert' | 'Verkauft' | 'Available' | 'Reserved' | 'Sold';
}

export interface LinkItem {
  text: string;
  url: string;
}

export interface PageData {
  id: string;
  uid: string;
  title: string;
  color: 'sand' | 'lemon' | 'forest';
  pointOfInterest?: boolean;
  narrow?: boolean;
  news?: boolean;
  facts?: FactItem[];
  paragraphs?: string[];
  apartments?: ApartmentItem[];
  links?: LinkItem[];
}

export interface PoiItemData {
  title: string;
  href: string;
  position: [number, number, number];
}

export interface HistoryItem {
  year: string;
  text: string;
}
