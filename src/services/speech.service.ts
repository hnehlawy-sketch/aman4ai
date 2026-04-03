import { Injectable, signal } from '@angular/core';

declare var window: any;

@Injectable({ providedIn: 'root' })
export class SpeechService {
  isListening = signal(false);

  private recognition: any;

  startVoiceInput(lang: 'ar' | 'en', onResult: (text: string) => void, onError: (err: any) => void) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      onError(new Error('Speech recognition not supported in this browser.'));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening.set(true);
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech error', event.error);
      this.isListening.set(false);
      onError(event.error);
    };

    this.recognition.start();
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening.set(false);
    }
  }
}
