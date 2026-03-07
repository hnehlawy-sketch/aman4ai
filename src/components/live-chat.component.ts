import { Component, ElementRef, ViewChild, inject, signal, input, model, WritableSignal, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GeminiService, ChatMessage } from '../services/gemini.service';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { DataLoggingService } from '../services/data-logging.service';
import { translations } from '../translations';
import { SafePipe } from '../pipes/safe.pipe';

declare var window: any;

@Component({
  selector: 'app-live-chat',
  standalone: true,
  imports: [CommonModule, SafePipe],
  template: `
    <div class="fixed inset-0 z-[100] bg-[#0a0a0a] text-white overflow-hidden flex flex-col font-sans">
      
      <!-- Atmospheric Background -->
      <div class="absolute inset-0 z-0 opacity-60 transition-opacity duration-1000" [class.opacity-100]="liveState() === 'speaking'">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[100px] transition-all duration-300 ease-out"
             [style.transform]="'translate(-50%, -50%) scale(' + audioScale() + ')'"
             [class.bg-indigo-500]="liveState() === 'speaking'"
             [class.bg-blue-500]="liveState() === 'listening'"
             [class.bg-slate-700]="liveState() === 'idle' || liveState() === 'connecting'"
             [class.opacity-20]="liveState() === 'idle'"
             [class.opacity-40]="liveState() !== 'idle'">
        </div>
      </div>

      <!-- Header -->
      <div class="relative z-10 p-6 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
              <path fill-rule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clip-rule="evenodd" />
            </svg>
          </div>
          <span class="font-medium tracking-wide text-lg">Aman Live</span>
        </div>
        
        <button (click)="closeLiveView()" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Main Content Area (Transcript & Visualizer) -->
      <div class="flex-1 relative flex flex-col items-center justify-center p-6 z-10">
        
        <!-- Central Visualizer (Canvas for precise drawing) -->
        <div class="relative w-64 h-64 flex items-center justify-center mb-12">
          <canvas #liveCanvas class="absolute inset-0 w-full h-full"></canvas>
          
          <!-- Core Orb -->
          <div class="absolute w-24 h-24 rounded-full bg-black border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center z-10 transition-transform duration-200"
               [style.transform]="'scale(' + audioScale() + ')'">
            @if (liveState() === 'listening') {
              <div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
            } @else if (liveState() === 'speaking') {
              <div class="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
            } @else if (liveState() === 'connecting') {
              <svg class="animate-spin h-6 w-6 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            }
          </div>
        </div>

        <!-- Transcript -->
        <div class="w-full max-w-2xl text-center space-y-4 min-h-[120px] flex flex-col justify-end">
          
          <!-- Visual Content Display -->
          @if (visualContent(); as content) {
            <div class="mb-6 animate-scaleIn">
              @if (content.type === 'image') {
                <div class="relative group">
                  <img [src]="content.data" class="max-h-[300px] rounded-2xl shadow-2xl border-2 border-white/20 mx-auto object-contain bg-black/40">
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4 rounded-2xl">
                    <span class="text-xs text-white/80">تم التوليد بواسطة أمان</span>
                  </div>
                </div>
              } @else if (content.type === 'map') {
                <div class="w-full h-[250px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl relative">
                   <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    style="border:0"
                    [src]="'https://www.google.com/maps/embed/v1/view?key=' + (authService.systemSettings()?.mapsApiKey || 'YOUR_API_KEY') + '&center=' + content.data.lat + ',' + content.data.lng + '&zoom=14' | safe:'resource'"
                    allowfullscreen>
                  </iframe>
                  <!-- Fallback if iframe fails or key missing, using a simple static map or just a label -->
                  <div class="absolute inset-0 bg-blue-900/20 pointer-events-none"></div>
                  <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs border border-white/10">
                    {{ content.data.label || 'موقع جغرافي' }}
                  </div>
                </div>
              }
              <button (click)="visualContent.set(null)" class="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors underline">إخفاء</button>
            </div>
          }

          <p class="text-2xl sm:text-4xl font-light leading-tight tracking-tight text-white/90 transition-all duration-300"
             [class.opacity-50]="liveState() === 'speaking'">
            {{ liveFinalTranscript() }}
            <span class="text-white/50">{{ liveInterimTranscript() }}</span>
          </p>
          
          @if (!liveFinalTranscript() && !liveInterimTranscript() && liveState() === 'listening') {
            <p class="text-xl text-white/40 font-light animate-pulse">{{ t().listening || 'أنا أستمع إليك...' }}</p>
          }
          @if (liveState() === 'error') {
            <p class="text-xl text-red-400 font-light">{{ liveError() || t().liveError }}</p>
          }
        </div>
      </div>

      <!-- Controls -->
      <div class="relative z-10 p-8 flex justify-center items-center gap-6">
        @if (liveState() === 'speaking') {
          <button (click)="interruptAISpeech()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all group">
            <div class="w-4 h-4 bg-white rounded-sm group-hover:scale-90 transition-transform"></div>
          </button>
        }
        
        <button (click)="handleLiveViewMainButtonClick()" 
                class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl"
                [class.bg-white]="liveState() === 'idle' || liveState() === 'error'"
                [class.text-black]="liveState() === 'idle' || liveState() === 'error'"
                [class.bg-red-500]="liveState() === 'listening' || liveState() === 'speaking'"
                [class.text-white]="liveState() === 'listening' || liveState() === 'speaking'"
                [class.hover:scale-105]="true"
                [class.active:scale-95]="true">
          
          @if (liveState() === 'idle' || liveState() === 'error') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
              <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
            </svg>
          }
        </button>
      </div>
      
      <!-- Voice Selector (Overlay) -->
      @if (showVoiceSelector()) {
        <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <h3 class="text-lg font-bold mb-4">{{ t().voicePreference || 'تفضيل الصوت' }}</h3>
          <div class="flex gap-4">
            <button (click)="selectVoice('Puck')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
              <span class="text-3xl">👨</span>
              <span class="text-sm font-medium">{{ t().voiceMale || 'صوت شاب' }}</span>
            </button>
            <button (click)="selectVoice('Kore')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
              <span class="text-3xl">👩</span>
              <span class="text-sm font-medium">{{ t().voiceFemale || 'صوت فتاة' }}</span>
            </button>
          </div>
        </div>
      }
    </div>
  `

})
export class LiveChatComponent implements OnDestroy {
  geminiService = inject(GeminiService);
  authService = inject(AuthService);
  uiService = inject(UiService);
  private logger = inject(DataLoggingService);

  t = input<any>(translations.ar);
  messages = model<ChatMessage[]>([]);
  
  liveState = signal<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  liveInterimTranscript = signal('');
  liveFinalTranscript = signal('');
  liveError = signal('');
  showVoiceSelector = signal(false);
  
  visualContent = signal<{ type: 'image' | 'map', data: any } | null>(null);
  
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  private nextStartTime: number = 0;
  private audioQueue: AudioBufferSourceNode[] = [];

  // Buffers for history syncing
  private currentUserText = '';
  private currentModelText = '';

  @ViewChild('liveCanvas') private liveCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('liveBlob') private liveBlob!: ElementRef<HTMLDivElement>;

  ngOnDestroy() {
    this.closeLiveView();
  }

  closeLiveView() {
    // Commit any pending transcripts before closing
    if (this.currentUserText.trim()) {
      this.addMessageToHistory('user', this.currentUserText.trim());
    }
    if (this.currentModelText.trim()) {
      this.addMessageToHistory('model', this.currentModelText.trim());
    }

    this.uiService.closeLiveView();
    this.stopLiveSession();
    this.liveState.set('idle');
    this.liveInterimTranscript.set('');
    this.liveFinalTranscript.set('');
    this.liveError.set('');
    this.currentUserText = '';
    this.currentModelText = '';
  }

  private usageInterval: any;

  async startLiveSession(selectedVoice?: string) {
    // Check limit before starting
    const hasTokens = await this.authService.checkAndIncrementUsage(500); // Initial estimate
    if (!hasTokens) {
      this.uiService.showToast(this.t().limitExceeded || 'تم تجاوز الحد اليومي، يرجى الترقية.', 'error');
      this.uiService.openUpgradeModal('pro');
      return;
    }

    this.liveState.set('connecting');
    this.liveError.set('');
    
    const userProfile = this.authService.userProfile();
    const voiceName = selectedVoice || userProfile?.voiceName || 'Puck';

    try {
      await this.geminiService.startLiveSession({
        onopen: () => {
          console.log('Live session opened');
          this.liveState.set('listening');
          this.setupAudio();
          
          // Start periodic usage check
          this.usageInterval = setInterval(async () => {
             const hasMoreTokens = await this.authService.checkAndIncrementUsage(500);
             if (!hasMoreTokens) {
               this.interruptAISpeech();
               this.stopLiveSession();
               this.liveState.set('idle');
               this.uiService.showToast(this.t().limitExceeded || 'تم تجاوز الحد اليومي، يرجى الترقية.', 'error');
               this.uiService.openUpgradeModal('pro');
             }
          }, 60000); // Check every minute
        },
        onmessage: (msg) => this.handleLiveMessage(msg),
        onclose: () => {
          console.log('Live session closed');
          this.stopLiveSession();
        },
        onerror: (err) => {
          console.error('Live session error', err);
          this.liveError.set(this.t().liveError);
          this.liveState.set('error');
        },
        voiceName: voiceName,
        userProfile: userProfile, // Pass user profile for personalization
        userPlan: this.authService.userPlan()
      });
    } catch (error: any) {
      console.error("Failed to start live session:", error);
      this.liveError.set(error.message || this.t().liveError);
      this.liveState.set('error');
      this.stopLiveSession();
    }
  }

  stopLiveSession() {
    if (this.usageInterval) {
      clearInterval(this.usageInterval);
      this.usageInterval = null;
    }
    this.geminiService.stopLiveSession();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioQueue.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    this.audioQueue = [];
    this.nextStartTime = 0;
  }

  async setupAudio() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported by your browser.");
    }
    
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    
    // Create processor for mic capture
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.liveState() === 'listening') {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = this.floatTo16BitPCM(inputData);
        const base64 = this.arrayBufferToBase64(pcmData.buffer);
        this.geminiService.sendLiveAudio(base64);
      }
    };
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    const canvas = this.liveCanvas.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    this.drawVisualizer();
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  private pcm16ToFloat32(input: Int16Array): Float32Array {
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] / 0x8000;
    }
    return output;
  }

  handleLiveMessage(msg: any) {
    console.log('[LiveChat] Received message:', JSON.stringify(msg, null, 2));
    
    // Handle transcriptions
    if (msg.inputTranscription) {
      this.liveInterimTranscript.set(msg.inputTranscription.data);
      if (msg.inputTranscription.final) {
        this.addMessageToHistory('user', msg.inputTranscription.data);
        this.liveInterimTranscript.set('');
      }
    }

    if (msg.outputTranscription) {
      this.liveInterimTranscript.set(msg.outputTranscription.data);
      if (msg.outputTranscription.final) {
        this.addMessageToHistory('model', msg.outputTranscription.data);
        this.liveInterimTranscript.set('');
      }
    }

    // Handle audio output and direct text parts
    if (msg.serverContent?.modelTurn?.parts) {
      let text = '';
      for (const part of msg.serverContent.modelTurn.parts) {
        if (part.text) text += part.text;
        if (part.inlineData?.data) {
          this.playAudioChunk(part.inlineData.data);
        }
      }
      if (text) {
        this.currentModelText += text;
        this.liveInterimTranscript.set(this.currentModelText);
      }
    }

    if (msg.serverContent?.userTurn?.parts) {
      let text = '';
      for (const part of msg.serverContent.userTurn.parts) {
        if (part.text) text += part.text;
      }
      if (text) {
        this.currentUserText += text;
        this.liveInterimTranscript.set(this.currentUserText);
      }
    }

    // Handle turn completion
    if (msg.serverContent?.turnComplete) {
      if (this.currentUserText.trim()) {
        this.addMessageToHistory('user', this.currentUserText.trim());
        this.currentUserText = '';
      }
      if (this.currentModelText.trim()) {
        this.addMessageToHistory('model', this.currentModelText.trim());
        this.currentModelText = '';
      }
      this.liveInterimTranscript.set('');
    }

    // Handle tool calls
    if (msg.toolCall) {
      console.log('Live Tool Call received:', msg.toolCall);
      for (const call of msg.toolCall.functionCalls) {
        this.handleLiveToolCall(call);
      }
    }

    // Handle interruptions
    if (msg.serverContent?.interrupted) {
      if (this.currentModelText.trim()) {
        this.addMessageToHistory('model', this.currentModelText.trim() + ' [تمت المقاطعة]');
        this.currentModelText = '';
      }
      this.interruptAISpeech();
    }
  }

  private async handleLiveToolCall(call: any) {
    const { name, args, id } = call;
    console.log(`[LiveChat] Handling tool call: ${name}`, args);
    let intentText = '';
    let isCustomTool = false;
    let toastMessage = '';

    if (name === 'generateImage') {
      intentText = `[طلب توليد صورة: ${args.prompt}]`;
      toastMessage = 'جاري تحضير الصورة...';
      isCustomTool = true;
      
      console.log('[LiveChat] Generating image for prompt:', args.prompt);

      // Execute image generation in background
      this.geminiService.sendMessage([{ id: crypto.randomUUID(), role: 'user', text: args.prompt }], this.authService.userPlan(), undefined, {
        generateImage: true,
        modelKey: 'fast',
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }).subscribe({
        next: (res) => {
          console.log('[LiveChat] Image generation response:', res);
          if (res.images && res.images.length > 0) {
            console.log('[LiveChat] Image generated successfully:', res.images[0].url);
            const imageUrl = res.images[0].url;
            this.visualContent.set({ type: 'image', data: imageUrl });
            this.addMessageToHistory('model', `[تم توليد الصورة: ${args.prompt}]`, [{ url: imageUrl, mimeType: 'image/png' }]);
          } else {
            console.warn('[LiveChat] Image generation failed: No images returned');
            this.uiService.showToast('فشل توليد الصورة', 'error');
          }
        },
        error: (err) => {
          console.error('[LiveChat] Image generation error:', err);
          this.uiService.showToast('حدث خطأ أثناء توليد الصورة', 'error');
        }
      });

    } else if (name === 'getUserLocation') {
      intentText = `[طلب معرفة الموقع الحالي]`;
      toastMessage = 'جاري تحديد الموقع...';
      isCustomTool = true;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.visualContent.set({ type: 'map', data: { lat, lng, label: 'موقعك الحالي' } });
          this.addMessageToHistory('model', `[تم تحديد الموقع: ${lat}, ${lng}]`);
        });
      }

    } else if (name === 'searchLocation') {
      intentText = `[طلب البحث عن موقع: ${args.query}]`;
      toastMessage = `جاري البحث عن ${args.query}...`;
      isCustomTool = true;

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.query)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const label = data[0].display_name.split(',')[0];
          this.visualContent.set({ type: 'map', data: { lat, lng, label } });
          this.addMessageToHistory('model', `[تم العثور على الموقع: ${label}]`);
        }
      } catch (e) {}

    } else if (name === 'googleSearch') {
      intentText = `[طلب بحث في الويب]`;
    }

    if (intentText) {
      this.addMessageToHistory('model', intentText);
    }

    // Send tool response back to live session for custom tools
    if (isCustomTool) {
      this.geminiService.sendLiveToolResponse(id, { success: true });
      if (toastMessage) {
        this.uiService.showToast(toastMessage, 'info');
      }
    }
  }

  private addMessageToHistory(role: 'user' | 'model', text: string, images?: { url: string | null, mimeType: string }[]) {
    try {
      if (!text.trim() && (!images || images.length === 0)) return;
      console.log(`[LiveChat] Committing message to history: ${role} - ${text.substring(0, 30)}...`);
      const user = this.authService.user();
      if (user) {
        this.logger.log({
          uid: user.uid,
          email: user.email || '',
          type: 'chat',
          content: { role, text, mode: 'live', hasImages: !!images }
        });
      }
      this.messages.update(msgs => {
        const newMsgs = [
          ...msgs,
          {
            id: crypto.randomUUID(),
            role: role,
            text: text,
            generatedImages: images
          }
        ];
        console.log(`[LiveChat] Signal updated, new length: ${newMsgs.length}`);
        return newMsgs;
      });
    } catch (e) {
      console.error('Failed to update chat history', e);
    }
  }

  private playAudioChunk(base64: string) {
    if (!this.audioContext) return;
    
    this.liveState.set('speaking');
    const pcmData = this.base64ToArrayBuffer(base64);
    const floatData = this.pcm16ToFloat32(new Int16Array(pcmData));
    
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.05; // Small buffer
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.audioQueue.push(source);
    
    source.onended = () => {
      this.audioQueue = this.audioQueue.filter(s => s !== source);
      if (this.audioQueue.length === 0) {
        this.liveState.set('listening');
        this.liveInterimTranscript.set('');
      }
    };
  }

  audioScale = signal(1);
  private smoothedRms = 0;

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
      
      // Smooth RMS for scale
      this.smoothedRms = this.smoothedRms * 0.8 + rms * 0.2;
      this.audioScale.set(1 + (this.smoothedRms / 40));

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 50; // slightly larger than the core orb

      // Draw waveform circle
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const angle = (i / bufferLength) * Math.PI * 2;
        const radius = baseRadius + (v * this.smoothedRms * 1.5);
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      
      // Style based on state
      if (this.liveState() === 'speaking') {
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.4 + (this.smoothedRms / 50)})`; // Orange
        ctx.lineWidth = 2 + (this.smoothedRms / 15);
      } else if (this.liveState() === 'listening') {
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + (this.smoothedRms / 50)})`; // Blue
        ctx.lineWidth = 2 + (this.smoothedRms / 20);
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
      }
      
      ctx.stroke();
      
      // Draw a second, smoother ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + this.smoothedRms, 0, 2 * Math.PI);
      ctx.strokeStyle = this.liveState() === 'speaking' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1 + (this.smoothedRms / 10);
      ctx.stroke();
    };
    draw();
  }

  handleLiveViewMainButtonClick() {
    switch (this.liveState()) {
      case 'idle':
      case 'error':
        // Check if voice is set
        const profile = this.authService.userProfile();
        if (!profile?.voiceName) {
          this.showVoiceSelector.set(true);
        } else {
          this.startLiveSession();
        }
        break;
      case 'listening':
        this.stopLiveSession();
        this.liveState.set('idle');
        break;
    }
  }

  async selectVoice(voice: 'Puck' | 'Kore') {
    this.showVoiceSelector.set(false);
    
    const user = this.authService.user();
    if (user) {
      const currentProfile = this.authService.userProfile() || { name: '', dob: '', education: 'unspecified', maritalStatus: 'unspecified', instructions: '' };
      // Do not await to prevent UI freezing if offline
      this.authService.saveUserProfile(user.uid, { ...currentProfile, voiceName: voice }).catch(e => console.warn('Failed to save voice preference', e));
    }
    
    this.startLiveSession(voice);
  }

  interruptAISpeech() {
    if (this.liveState() === 'speaking') {
      this.audioQueue.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.audioQueue = [];
      this.nextStartTime = 0;
      this.liveState.set('listening');
      this.liveInterimTranscript.set('');
    }
  }
}
