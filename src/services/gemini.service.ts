import { Injectable } from '@angular/core';
import { UserProfile } from '../models';

// ============================================================
// ⚠️ رابط الـ Worker (الخادم الوكيل)
// ============================================================
const WORKER_URL = 'https://aman-ai.h-nehlawy.workers.dev'; 

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  isError?: boolean;
  fileData?: { mimeType: string, data: string, name: string };
  generatedImages?: { url: string, mimeType: string, alt?: string }[]; 
  generatedFile?: { content: string; type: 'pdf' | 'docx' | 'txt'; filename: string };
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  
  constructor() {}

  startNewChat(lang: 'ar' | 'en' = 'ar') {
    // Reset connection state if needed
  }

  /**
   * Sends chat history to the Custom Worker, which now handles all complex logic.
   */
  async sendMessage(
    history: ChatMessage[],
    isPremium: boolean,
    signal?: AbortSignal,
    options?: { modelKey?: string; userProfile?: UserProfile | null }
  ): Promise<{ text: string, images?: { url: string, mimeType: string, alt?: string }[], generatedFile?: ChatMessage['generatedFile'] }> { 
    
    // 1. Prepare Request Body
    const contents = history
      .filter(msg => msg.role !== 'system' && !msg.isError)
      .map(msg => {
        const parts: any[] = [];
        if (msg.text) parts.push({ text: msg.text });
        
        if (msg.fileData && msg.fileData.data) {
          parts.push({
            inlineData: {
              mimeType: msg.fileData.mimeType,
              data: msg.fileData.data
            }
          });
        }
        
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: parts
        };
      });

    const requestBody = {
      action: 'chat',
      contents: contents,
      modelKey: options?.modelKey || 'fast',
      userProfile: options?.userProfile || null
    };

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Request failed with status ${response.status}` 
        }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // The worker now returns the exact format we need.
      return {
        text: data.text || '',
        images: data.images || [],
        generatedFile: data.generatedFile || undefined
      };

    } catch (error: any) {
      console.error('Gemini Service Error:', error);
      if (error.name === 'AbortError') throw new Error('تم إيقاف التوليد.');
      if (error.message.includes('Failed to fetch')) {
          throw new Error('فشل الاتصال بالخادم. تأكد من الإنترنت.');
      }
      throw error;
    }
  }

  /**
   * Text-to-Speech via worker. Returns an audio URL (WAV) for playback.
   */
  async synthesizeSpeech(text: string, voice: string = 'Charon'): Promise<{ url: string; mimeType: string }> {
    const payload = {
      action: 'tts',
      text,
      voice,
      modelKey: 'tts'
    };

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    if (!response.ok) {
      let errMsg = `Error ${response.status}`;
      try {
        const errJson = raw ? JSON.parse(raw) : null;
        if (errJson?.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }

    if (!raw) throw new Error('Empty TTS response');

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Invalid TTS response');
    }

    if (data?.error) throw new Error(data.error);

    const audioUrl = data?.audioUrl || data?.url;
    if (audioUrl && typeof audioUrl === 'string') {
      return { url: audioUrl, mimeType: data?.mimeType || 'audio/wav' };
    }

    const audioData = data?.audio?.data;
    const mimeType = data?.audio?.mimeType || 'audio/pcm;rate=24000';

    if (!audioData || typeof audioData !== 'string') {
      throw new Error('No audio data returned');
    }

    const cleanBase64 = this.stripDataUrlPrefix(audioData);
    if (this.isPcmMime(mimeType)) {
      const wavBlob = this.pcmBase64ToWavBlob(cleanBase64, this.extractSampleRate(mimeType) || 24000, 1);
      const url = URL.createObjectURL(wavBlob);
      return { url, mimeType: 'audio/wav' };
    }

    const blob = this.base64ToBlob(cleanBase64, mimeType);
    const url = URL.createObjectURL(blob);
    return { url, mimeType };
  }

  async getLiveToken(): Promise<{ token: string, fallback?: boolean }> {
    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'live_token' })
      });
      // Worker might return 200 on error with fallback token, so we check both statuses.
      if (!response.ok && response.status !== 200) {
         const errorText = await response.text();
         throw new Error(`Worker error: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      if (data.error && !data.token) {
        throw new Error(data.error);
      }
      if (!data.token) {
        throw new Error('No token received from worker.');
      }
      return { token: data.token, fallback: data.fallback === true };
    } catch (error: any) {
      console.error('Failed to get live token:', error);
      throw new Error('Could not get live session token.');
    }
  }

  private stripDataUrlPrefix(input: string): string {
    if (!input) return '';
    const idx = input.indexOf('base64,');
    return idx >= 0 ? input.slice(idx + 7) : input.trim();
  }

  private extractSampleRate(mimeType: string): number | null {
    const match = mimeType.match(/rate=(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);
    return null;
  }

  private isPcmMime(mimeType?: string): boolean {
    if (!mimeType) return false;
    const m = mimeType.toLowerCase();
    return m.includes('audio/pcm') || m.includes('audio/l16') || m.includes('codec=pcm');
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  private pcmBase64ToWavBlob(base64Pcm: string, sampleRate: number, channels: number): Blob {
    const pcmBytes = this.base64ToUint8(base64Pcm);
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    const buffer = new ArrayBuffer(44 + pcmBytes.length);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.length, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmBytes.length, true);

    new Uint8Array(buffer, 44).set(pcmBytes);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private writeString(view: DataView, offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }
}