import { ChatMessage } from './services/gemini.service';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface UserProfile {
  name: string;
  dob: string; // YYYY-MM-DD
  education: 'unspecified' | 'highschool' | 'diploma' | 'university' | 'masters' | 'phd';
  maritalStatus: 'unspecified' | 'single' | 'married' | 'divorced' | 'widowed';
  instructions: string;
  voiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface PaymentRequest {
  id?: string;
  uid: string;
  email: string;
  transactionId: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
  barcodeUrl?: string;
  planRequested?: 'pro' | 'premium';
}

export interface LogEntry {
  id?: string;
  uid: string;
  email: string;
  timestamp: string;
  type: 'chat' | 'image' | 'location' | 'file' | 'auth' | 'error' | 'token_usage';
  content: any;
  tokens?: number;
  metadata?: any;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  isPremium: boolean;
  plan?: 'free' | 'pro' | 'premium';
  tokenUsage: number;
  isSuspended?: boolean;
  accountingId?: string;
  customVariables?: {[key: string]: any};
  subscriptionEndDate?: string;
  customDailyLimit?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
  icon?: string;
  iconUrl?: string;
  isActive: boolean;
  qrCodeUrl?: string;
}

export interface SystemSettings {
  models: {
    fast: string;
    core: string;
    pro: string;
    image: string;
    live: string;
    tts: string;
  };
  limits: {
    free: number;
    pro: number;
  };
}
