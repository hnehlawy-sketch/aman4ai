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
}

export interface PaymentRequest {
  id?: string;
  uid: string;
  email: string;
  transactionId: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}
