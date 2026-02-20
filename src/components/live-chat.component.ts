import { Component, ElementRef, ViewChild, inject, signal, input, WritableSignal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, ChatMessage } from '../services/gemini.service';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';

declare var window: any;

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
   <div class="fixed inset-0 z-[100] flex flex-col bg-gradient-to-br from-[#1e293b] via-slate-900 to-black text-white fade-in">
      <!-- Header -->
      <div class="flex-none p-4 flex justify-between items-center w-full max-w-4xl mx-auto z-10">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span class="text-xs font-bold text-red-400 tracking-wider">LIVE</span>
        </div>
        <button (click)="closeLiveView()" 
                class="px-4 py-2 text-sm rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          {{ t().exit }}
        </button>
      </div>
      
      <!-- Transcript Area -->
      <div class="flex-1 flex flex-col items-center justify-end w-full max-w-3xl mx-auto text-center p-4 pb-8 overflow-y-auto min-h-0 z-10">
          <p class="text-2xl sm:text-3xl font-medium leading-relaxed">
            @if (liveState() !== 'speaking') {
              <span class="opacity-60">{{ liveFinalTranscript() }}</span>
              <span class="text-orange-400">{{ liveInterimTranscript() }}</span>
            } @else {
              <span class="opacity-90">{{ liveInterimTranscript() }}</span>
            }
          </p>
      </div>

      <!-- Controls Footer -->
      <div class="flex-none h-[280px] w-full flex flex-col items-center justify-start pt-8 relative overflow-hidden">
        <div #liveBlob 
             class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] bg-gradient-radial from-orange-500/20 via-amber-500/5 to-transparent rounded-full blur-3xl transition-transform duration-300 ease-out">
        </div>

        <canvas #liveCanvas class="absolute inset-0 w-full h-full z-0"></canvas>
        
        <div class="relative z-10 flex items-center justify-center gap-6">
            @if(liveState() === 'speaking') {
              <button (click)="interruptAISpeech()" 
                      class="w-20 h-20 flex flex-col items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90 animate-slide-up"
                      [title]="t().stop">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563C9.252 15 9 14.748 9 14.437V9.564Z" />
                  </svg>
                  <span class="text-[10px] uppercase font-bold mt-1 opacity-80">{{ t().stop }}</span>
              </button>
            }
            
            <button (click)="handleLiveViewMainButtonClick()" 
                    [disabled]="liveState() === 'connecting'"
                    class="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 disabled:cursor-not-allowed"
                    [class.bg-orange-500]="liveState() === 'idle' || liveState() === 'error'"
                    [class.hover:bg-orange-600]="liveState() === 'idle' || liveState() === 'error'"
                    [class.animate-pulse]="liveState() === 'idle'"
                    [class.bg-red-600]="liveState() === 'listening'"
                    [class.hover:bg-red-700]="liveState() === 'listening'"
                    [class.bg-transparent]="liveState() === 'speaking'">
              
              @switch (liveState()) {
                @case ('idle') { <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg> }
                @case ('connecting') { <svg class="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> }
                @case ('listening') { <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-white"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" /></svg> }
                @case ('speaking') {
                  <div class="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                  </div>
                }
                @case ('error') { <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-white"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg> }
              }
            </button>
        </div>
        
        <p class="text-sm font-medium opacity-80 h-6 mt-8 z-10">
          @switch(liveState()) {
            @case('idle') { <span>{{ t().liveIdle }}</span> }
            @case('connecting') { <span>{{ t().liveConnecting }}</span> }
            @case('listening') { <span>{{ t().listening }}</span> }
            @case('speaking') { <span>{{ t().liveSpeaking }}</span> }
            @case('error') { <span class="text-red-400">{{ liveError() || t().liveError }}</span> }
          }
        </p>
      </div>
    </div>
  `
})
export class LiveChatComponent implements OnDestroy {
  geminiService = inject(GeminiService);
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input.required<any>();
  messagesSignal = input.required<WritableSignal<ChatMessage[]>>();
  
  liveState = signal<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  liveInterimTranscript = signal('');
  liveFinalTranscript = signal('');
  liveError = signal('');
  
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  private recognition: any | null = null;
  private audioPlayer: HTMLAudioElement | null = null;

  @ViewChild('liveCanvas') private liveCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('liveBlob') private liveBlob!: ElementRef<HTMLDivElement>;

  ngOnDestroy() {
    this.closeLiveView();
  }

  closeLiveView() {
    this.uiService.closeLiveView();
    this.audioPlayer?.pause();
    this.audioPlayer = null;
    this.stopLiveSession();
    this.liveState.set('idle');
    this.liveInterimTranscript.set('');
    this.liveFinalTranscript.set('');
    this.liveError.set('');
  }

  async startLiveSession() {
    this.liveState.set('connecting');
    this.liveError.set('');
    try {
      await this.geminiService.getLiveToken();
      await this.setupMicrophoneVisualizer();
      this.setupSpeechRecognition();
      this.recognition.start();
    } catch (error: any) {
      console.error("Failed to start live session:", error);
      this.liveError.set(error.message || this.t().liveError);
      this.liveState.set('error');
      this.stopLiveSession();
    }
  }

  stopLiveSession() {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  async setupMicrophoneVisualizer() {
    if (!this.liveCanvas?.nativeElement) {
       await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported by your browser.");
    }
    
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    
    const canvas = this.liveCanvas.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    this.drawVisualizer();
  }

  drawVisualizer() {
    if (!this.analyser || !this.liveCanvas?.nativeElement || !this.audioContext) return;
    
    const canvas = this.liveCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      if (!this.analyser) return;
      
      this.analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] - 128) * (dataArray[i] - 128);
      }
      let rms = Math.sqrt(sum / bufferLength);

      if (this.liveBlob?.nativeElement) {
        const scale = 1 + (rms / 30);
        this.liveBlob.nativeElement.style.transform = `scale(${scale})`;
      }

      const baseRadius = 48;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, baseRadius + (rms * 2) + 45, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.1 + (rms / 80)})`;
      ctx.lineWidth = 1 + (rms / 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, baseRadius + (rms * 2.5) + 20, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.2 + (rms / 40)})`;
      ctx.lineWidth = 2 + (rms / 10);
      ctx.stroke();
    };
    draw();
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error("Speech Recognition is not supported by your browser.");
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.t().language.toLowerCase().includes('en') ? 'en-US' : 'ar-SA';

    this.recognition.onstart = () => this.liveState.set('listening');

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = this.liveFinalTranscript();
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      this.liveFinalTranscript.set(final);
      this.liveInterimTranscript.set(interim);
    };
    
    this.recognition.onend = () => {
      const finalTranscript = (this.liveFinalTranscript() + this.liveInterimTranscript()).trim();
      if (this.liveState() === 'listening' && finalTranscript) {
         this.liveFinalTranscript.set(finalTranscript);
         this.liveInterimTranscript.set('');
         this.handleLiveMessage(finalTranscript);
      } else if (this.uiService.liveViewOpen() && this.liveState() !== 'speaking') {
         try { this.recognition.start(); } catch(e) {}
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        this.liveError.set(event.error === 'no-speech' ? 'No speech detected.' : 'Speech recognition error.');
        this.liveState.set('error');
      }
    };
  }

  async handleLiveMessage(text: string) {
    if (!text || this.liveState() === 'speaking') return;
    
    this.liveState.set('speaking');
    this.recognition.stop(); 

    try {
      const history: ChatMessage[] = [...this.messagesSignal()(), { role: 'user', text }];
      
      const response = await this.geminiService.sendMessage(history, this.authService.isPremium(), undefined, { modelKey: 'live' });

      const responseText = response.text;
      if (responseText) {
        this.liveInterimTranscript.set(responseText);
        this.liveFinalTranscript.set('');

        const audio = await this.geminiService.synthesizeSpeech(responseText);
        this.audioPlayer = new Audio(audio.url);
        this.audioPlayer.play();

        this.audioPlayer.onended = () => {
          if (this.uiService.liveViewOpen()) {
            this.liveInterimTranscript.set('');
            this.recognition.start();
          }
        };
        
        this.audioPlayer.onerror = () => {
          if (this.uiService.liveViewOpen()) {
            this.liveError.set('Audio playback failed.');
            this.liveState.set('error');
          }
        };

        this.messagesSignal().update(m => [...m, {role: 'user', text}, {role: 'model', text: responseText}]);
      } else {
        if (this.uiService.liveViewOpen()) this.recognition.start();
      }
    } catch (error: any) {
      this.liveError.set(error.message);
      this.liveState.set('error');
      setTimeout(() => {
          if (this.uiService.liveViewOpen()) {
              this.liveInterimTranscript.set('');
              this.liveFinalTranscript.set('');
              this.recognition?.start();
          }
      }, 2000);
    }
  }

  handleLiveViewMainButtonClick() {
    switch (this.liveState()) {
      case 'idle':
      case 'error':
        this.startLiveSession();
        break;
      case 'listening':
        this.recognition?.stop();
        break;
    }
  }

  interruptAISpeech() {
    if (this.liveState() === 'speaking') {
      this.audioPlayer?.pause();
      this.audioPlayer = null;
      this.liveInterimTranscript.set('');
      this.liveFinalTranscript.set('');
      this.recognition?.start();
    }
  }
}
