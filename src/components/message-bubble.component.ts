import { Component, input, computed, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, GeminiService } from '../services/gemini.service';
import { marked } from 'marked';
import * as DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full mb-6 group flex" 
         [class.justify-start]="!isUser()" 
         [class.justify-end]="isUser()">
      
      <!-- ================= USER LAYOUT (Bubble) ================= -->
      @if (isUser()) {
        <div class="max-w-[85%] sm:max-w-[75%] flex flex-col items-end">
          <div class="rounded-2xl rounded-tr-none px-5 py-3 shadow-md bg-gradient-to-br from-orange-500 to-amber-500 text-white relative">
            @if (message().fileData; as file) {
              <div class="mb-2 p-2 rounded-lg flex items-center gap-3 bg-black/10 border border-white/10">
                <div class="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs font-bold uppercase text-white">
                  {{ file.mimeType.split('/')[1] || 'FILE' }}
                </div>
                <div class="overflow-hidden text-right">
                  <p class="text-xs truncate font-bold">{{ file.name }}</p>
                </div>
              </div>
            }
            <div class="whitespace-pre-wrap leading-7 text-sm sm:text-base font-medium">
              {{ message().text }}
            </div>
          </div>
        </div>
      }

      <!-- ================= AI LAYOUT (Flat & Formatted) ================= -->
      @else {
        <div class="max-w-[95%] sm:max-w-[85%] flex gap-3 sm:gap-4">
          
          <!-- Avatar: App Logo (Shield Check) -->
          <div class="flex-none mt-1">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
               <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
             <div class="font-bold text-sm text-slate-900 dark:text-slate-200 mb-2">Aman</div>
             
             <!-- GENERATED IMAGES DISPLAY (Professional Grid) -->
             @if (message().generatedImages && message().generatedImages!.length > 0) {
               <div class="mb-4 grid gap-3"
                    [class.grid-cols-1]="message().generatedImages!.length === 1"
                    [class.grid-cols-2]="message().generatedImages!.length > 1"
                    [class.sm:grid-cols-2]="message().generatedImages!.length > 1">
                 
                 @for (img of message().generatedImages; track $index) {
                   <div class="relative group rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 transition-all duration-300 hover:shadow-xl">
                     
                     <!-- Aspect Ratio Container -->
                     <div class="aspect-square w-full relative">
                        <!-- 'crossorigin' helps with download/canvas issues -->
                        <img [src]="img.url" 
                             [alt]="img.alt || 'Generated Image'" 
                             class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                             crossorigin="anonymous"
                             loading="lazy">
                        
                        <!-- Gradient Overlay -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     </div>
                     
                     <!-- Actions Overlay -->
                     <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex gap-2">
                       
                       <button (click)="downloadImage(img.url)" class="p-2 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-105" title="Download High Quality">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" transform="rotate(-90 12 12)" />
                         </svg>
                       </button>

                       <a [href]="img.url" target="_blank" class="p-2 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-105" title="View Full Screen">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                         </svg>
                       </a>

                     </div>
                   </div>
                 }
               </div>
             }

             <!-- Formatted Text (Markdown) -->
             @if (message().text) {
                <div 
                  class="text-slate-700 dark:text-slate-300 prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words" 
                  [innerHTML]="renderedText()"
                  (click)="handleContentClick($event)">
                </div>
             }

             <!-- GENERATED FILE DOWNLOAD -->
             @if (message().generatedFile; as file) {
               <div class="mt-4">
                 <button (click)="downloadGeneratedFile(file)" class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors shadow-sm border border-orange-200 dark:border-orange-800/50">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                   </svg>
                   <span>{{ file.filename }}</span>
                 </button>
               </div>
             }

             <!-- Error -->
             @if (message().isError) {
                <div class="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <span>Error connecting.</span>
                </div>
             }
             
             <!-- Actions (Copy Only) -->
             @if (!message().isError && message().text) {
               <div class="mt-2 flex justify-end gap-2 no-print">
                  <!-- TTS Button -->
                  <button (click)="playAudio()" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Listen to Text">
                    @switch (ttsState()) {
                      @case ('idle') {
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                        </svg>
                      }
                      @case ('loading') {
                        <svg class="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      }
                      @case ('playing') {
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-orange-500">
                          <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
                        </svg>
                      }
                    }
                  </button>
                  <!-- Copy Button -->
                  <button (click)="copyText()" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Copy Full Text">
                    @if (copied()) {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-green-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                      </svg>
                    }
                  </button>
               </div>
             }
          </div>
        </div>
      }
    </div>
  `
})
export class MessageBubbleComponent {
  message = input.required<ChatMessage>();
  isUser = computed(() => this.message().role === 'user');
  renderedText = signal('');
  copied = signal(false);
  ttsState = signal<'idle' | 'loading' | 'playing'>('idle');
  
  private geminiService = inject(GeminiService);
  private audio = new Audio();

  constructor() {
    // 1. Configure Marked Renderer for Code Blocks with Modern UI
    const renderer = new marked.Renderer();
    // FIX: Corrected renderer.code signature for marked v12 to prevent compilation errors.
    // Corrected the signature for renderer.code to accept a single object argument based on the TypeScript error.
    renderer.code = (code: string, lang: string | undefined) => {
      const validLang = lang || 'code';
      return `
        <div class="code-wrapper group my-4 rounded-xl overflow-hidden bg-[#1e293b] text-white border border-slate-700/50 relative shadow-md" dir="ltr">
          <div class="flex justify-between items-center bg-[#0f172a]/80 backdrop-blur px-4 py-2 text-xs text-slate-400 select-none border-b border-slate-700/50">
            <div class="flex items-center gap-2">
               <div class="flex gap-1.5">
                 <div class="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div class="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                 <div class="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
               </div>
               <span class="font-mono font-semibold text-slate-300 ml-2 uppercase tracking-wider">${validLang}</span>
            </div>
            <button class="copy-code-btn flex items-center gap-1.5 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-md transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 pointer-events-none">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
               </svg>
               <span class="pointer-events-none font-medium">Copy Code</span>
            </button>
          </div>
          <pre class="!m-0 !p-4 !bg-[#1e293b] overflow-x-auto text-sm leading-6 font-mono"><code class="language-${validLang}">${DOMPurify.sanitize(code)}</code></pre>
        </div>
      `;
    };
    marked.use({ renderer });

    effect(() => {
      const msg = this.message();
      if (msg.role !== 'user' && msg.text) {
        try {
          const raw = marked.parse(msg.text) as string;
          this.renderedText.set(DOMPurify.sanitize(raw));
        } catch (e) {
          this.renderedText.set(msg.text); 
        }
      }
    });
  }

  handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const btn = target.closest('.copy-code-btn') as HTMLElement;
    
    if (btn) {
      const wrapper = btn.closest('.code-wrapper');
      if (wrapper) {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const textToCopy = codeElement.innerText;
          navigator.clipboard.writeText(textToCopy).then(() => {
            const span = btn.querySelector('span');
            if (span) {
              const originalText = span.textContent;
              span.textContent = 'Copied!';
              btn.classList.add('text-green-400');
              setTimeout(() => {
                span.textContent = originalText;
                btn.classList.remove('text-green-400');
              }, 2000);
            }
          });
        }
      }
    }
  }

  async playAudio() {
    if (this.ttsState() === 'playing') {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.ttsState.set('idle');
        return;
    }

    this.ttsState.set('loading');
    try {
        const textToSpeak = this.message().text;
        if (!textToSpeak) {
            this.ttsState.set('idle');
            return;
        }
        const { url } = await this.geminiService.synthesizeSpeech(textToSpeak);
        this.audio.src = url;
        this.audio.play();
        this.ttsState.set('playing');

        this.audio.onended = () => {
            this.ttsState.set('idle');
        };
        this.audio.onerror = () => {
            console.error('Error playing audio.');
            this.ttsState.set('idle');
        }
    } catch (error) {
        console.error('TTS failed', error);
        this.ttsState.set('idle');
    }
  }

  copyText() {
    const text = this.message().text;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  async downloadGeneratedFile(file: NonNullable<ChatMessage['generatedFile']>) {
    if (file.type === 'docx') {
      const doc = new Document({
        sections: [{
          children: file.content.split('\n').map(p => new Paragraph({
            children: [new TextRun(p)],
            bidirectional: true
          })),
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, file.filename);
    } else if (file.type === 'pdf') {
      const pdf = new jsPDF();
      pdf.text(file.content, 10, 10); // Basic text to PDF
      pdf.save(file.filename);
    } else { // txt
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, file.filename);
    }
  }

  async downloadImage(url: string) {
    // 1. Try Direct Fetch (Works for CORS enabled images)
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `aman-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // 2. Fallback: Open in new tab if download fails
      console.warn('Download fallback triggered', e);
      window.open(url, '_blank');
    }
  }
}
