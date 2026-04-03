import { Injectable, signal, WritableSignal } from '@angular/core';

declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  isListening = signal(false);

  startVoiceInput(
    currentLang: string,
    onResult: (transcript: string) => void,
    onError?: (error: any) => void
  ) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      this.isListening.set(true);
    };

    recognition.onend = () => {
      this.isListening.set(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error', event.error);
      this.isListening.set(false);
      if (onError) onError(event.error);
    };

    recognition.start();
  }
}
