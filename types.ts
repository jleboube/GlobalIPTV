export interface CountryData {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

export interface GeoCountry extends CountryData {
  lat: number;
  lng: number;
  channelCount?: number; // Estimated or mocked for visualization
}

export interface Channel {
  id: string;
  name: string;
  categories: string[];
  streamUrl: string;
  website?: string;
  logo?: string;
  is_nsfw?: boolean;
  status: 'unknown' | 'online' | 'offline';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: Array<{
    title?: string;
    uri: string;
  }>;
  images?: string[]; // Base64
}

export enum Tab {
  CHANNELS = 'CHANNELS',
  CHAT = 'CHAT'
}