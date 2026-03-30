import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, GeminiService } from '../../services/gemini.service';
import { UiService } from '../../services/ui.service';
import { ImageService } from '../../services/image.service';
import { ImageGridComponent } from './image-grid.component';
import { LocationCardComponent } from './location-card.component';
import { RouteCardComponent } from './route-card.component';
import { FileDownloadComponent } from './file-download.component';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import saveAs from 'file-saver';

@Component({
  selector: 'app-ai-message',
  standalone: true,
  imports: [
    CommonModule, 
    ImageGridComponent, 
    LocationCardComponent, 
    RouteCardComponent, 
    FileDownloadComponent
  ],
  host: {
    class: 'flex w-full',
    '[class.justify-start]': 'currentLang() === "en"',
    '[class.justify-end]': 'currentLang() === "ar"'
  },
  template: `
    <div class="flex gap-3 sm:gap-4 text-start group animate-slide-up"
         [class.flex-row]="currentLang() === 'en'"
         [class.flex-row-reverse]="currentLang() === 'ar'"
         [attr.data-message-id]="message().id"
         [class.max-w-full]="message().generatedImages && message().generatedImages!.length > 0"
         [class.w-full]="message().generatedImages && message().generatedImages!.length > 0"
         [class.max-w-[95%]]="!(message().generatedImages && message().generatedImages!.length > 0)"
         [class.sm:max-w-[85%]]="!(message().generatedImages && message().generatedImages!.length > 0)">
      
      <!-- AI Avatar -->
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-white">
          <path fill-rule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clip-rule="evenodd" />
        </svg>
      </div>

      <!-- Content Container -->
      <div class="flex-1 min-w-0">
         
         <!-- GENERATED IMAGES DISPLAY -->
         @if (message().generatedImages && message().generatedImages!.length > 0) {
           <app-image-grid 
             [images]="message().generatedImages!" 
             [t]="t()" 
             [prompt]="message().text">
           </app-image-grid>
         }

         <!-- Formatted Text (Markdown) -->
         @if (message().text) {
            <div 
              class="text-slate-800 dark:text-slate-100 prose prose-slate dark:prose-invert max-w-none break-words leading-7 text-base font-normal text-start" 
              (click)="handleContentClick($event)">
              @if (renderedText()) {
                <div [innerHTML]="renderedText()"></div>
              } @else {
                <div class="whitespace-pre-wrap">{{ message().text }}</div>
              }
            </div>
         }

         <!-- LOCATION CARD -->
         @if (message().location; as loc) {
           <div class="mt-4">
             <app-location-card [location]="loc" [t]="t()"></app-location-card>
           </div>
         }

         <!-- ROUTE CARD -->
         @if (message().route; as route) {
           <div class="mt-4">
             <app-route-card [route]="route"></app-route-card>
           </div>
         }

         <!-- GENERATED FILE DOWNLOAD -->
         @if (message().generatedFile; as file) {
           <div class="mt-4">
             <app-file-download [file]="file" (onDownload)="downloadGeneratedFile($event)"></app-file-download>
           </div>
         }

         <!-- Error -->
         @if (message().isError) {
            <div class="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 flex-shrink-0">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
               </svg>
               <span>{{ message().text || t().error }}</span>
            </div>
         }
         
         <!-- Actions -->
         @if (!message().isError && message().text) {
           <div class="mt-3 flex justify-start gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print">
              <!-- TTS Button -->
              <button (click)="playAudio()" 
                      class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                      [title]="t().listen || 'استماع'">
                @switch (ttsState()) {
                  @case ('idle') {
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                  }
                  @case ('loading') {
                    <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  }
                  @case ('playing') {
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-blue-500">
                      <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
                    </svg>
                  }
                }
              </button>
              
              <!-- Copy Button -->
              <button (click)="copyText()" 
                      class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                      [title]="t().copy || 'نسخ'">
                @if (copied()) {
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-green-500">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                  </svg>
                }
              </button>

              <!-- Share Button -->
              <button (click)="shareText()" 
                      class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                      [title]="t().share || 'مشاركة'">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
              </button>

              <!-- Export Menu Toggle (Optional, or just show buttons) -->
              <div class="flex gap-1 border-l border-slate-200 dark:border-slate-700 ml-1 pl-1">
                <!-- Export to Word -->
                <button (click)="exportToWord()" 
                        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Word">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </button>
                <!-- Export to PDF -->
                <button (click)="exportToPdf()" 
                        class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600 transition-colors"
                        title="PDF">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </button>
              </div>

              <!-- Delete Button -->
              <button (click)="onDelete.emit(message().id)" 
                      class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors ml-auto"
                      [title]="t().delete || 'حذف'">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
           </div>
         }
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .prose pre {
      background-color: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    :host ::ng-deep .prose code {
      background-color: transparent !important;
      padding: 0 !important;
      color: inherit !important;
      font-weight: inherit !important;
    }
    :host ::ng-deep .prose code::before,
    :host ::ng-deep .prose code::after {
      content: "" !important;
    }
  `]
})
export class AiMessageComponent {
  currentLang = input.required<string>();
  message = input.required<ChatMessage>();
  t = input.required<any>();
  
  onDelete = output<string>();

  private geminiService = inject(GeminiService);
  private uiService = inject(UiService);
  private imageService = inject(ImageService);
  private audio = new Audio();

  copied = signal(false);
  ttsState = signal<'idle' | 'loading' | 'playing'>('idle');

  private customRenderer = computed(() => {
    const renderer = new marked.Renderer();
    const translations = this.t();
    
    renderer.code = (code: string, lang: string | undefined) => {
      const validLang = lang || 'code';
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      return `
        <div class="code-wrapper group my-4 rounded-xl overflow-hidden bg-[#1e1e1e] text-gray-200 border border-gray-700 relative shadow-lg" dir="ltr">
          <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-700">
             <span class="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">${validLang}</span>
             <div class="flex items-center gap-2">
               <button type="button" class="share-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${translations.share || 'مشاركة'}">
                 <svg class="w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                 </svg>
               </button>
               <button type="button" class="copy-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${translations.copyCode || 'نسخ الكود'}">
                 <svg class="copy-icon w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                 </svg>
                 <svg class="check-icon w-4 h-4 text-green-500 pointer-events-none hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                 </svg>
               </button>
             </div>
          </div>
          <pre class="!m-0 !p-4 overflow-x-auto text-sm leading-6 font-mono text-gray-300 bg-[#1e1e1e]"><code class="language-${validLang}">${DOMPurify.sanitize(escapedCode)}</code></pre>
        </div>
      `;
    };
    return renderer;
  });

  renderedText = computed(() => {
    const msg = this.message();
    if (msg.text) {
      try {
        const raw = marked.parse(msg.text, { renderer: this.customRenderer() }) as string;
        return DOMPurify.sanitize(raw, {
          ADD_TAGS: ['svg', 'path', 'button', 'div', 'span', 'pre', 'code'],
          ADD_ATTR: ['class', 'dir', 'title', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'xmlns', 'type', 'aria-hidden', 'aria-label']
        });
      } catch (e) {
        return msg.text;
      }
    }
    return '';
  });

  handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Handle Copy
    const copyBtn = target.closest('.copy-code-btn') as HTMLElement;
    if (copyBtn) {
      const wrapper = copyBtn.closest('.code-wrapper');
      if (wrapper) {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const textToCopy = codeElement.textContent || (codeElement as HTMLElement).innerText || '';
          navigator.clipboard.writeText(textToCopy).then(() => {
            const copyIcon = copyBtn.querySelector('.copy-icon');
            const checkIcon = copyBtn.querySelector('.check-icon');
            
            if (copyIcon && checkIcon) {
              copyIcon.classList.add('hidden');
              checkIcon.classList.remove('hidden');
              
              setTimeout(() => {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
              }, 2000);
            }
          }).catch(err => console.error('Failed to copy code: ', err));
        }
      }
      return;
    }

    // Handle Share
    const shareBtn = target.closest('.share-code-btn') as HTMLElement;
    if (shareBtn) {
      const wrapper = shareBtn.closest('.code-wrapper');
      if (wrapper) {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const textToShare = codeElement.textContent || (codeElement as HTMLElement).innerText || '';
          if (navigator.share) {
            navigator.share({
              title: 'Code Snippet',
              text: textToShare
            }).catch(e => console.error(e));
          } else {
             this.uiService.showToast(this.t().shareNotSupported || 'المشاركة غير مدعومة', 'error');
          }
        }
      }
      return;
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

  shareText() {
    const text = this.message().text;
    if (text) {
      if (navigator.share) {
        navigator.share({
          title: 'Aman AI Message',
          text: text
        }).catch(err => console.error('Error sharing:', err));
      } else {
        this.copyText();
      }
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

  async exportToWord() {
    const text = this.message().text;
    if (!text) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Aman AI Response",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24,
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `aman-ai-export-${Date.now()}.docx`);
  }

  async exportToPdf() {
    const text = this.message().text;
    if (!text) return;

    const element = document.querySelector(`[data-message-id="${this.message().id}"]`) as HTMLElement;
    if (!element) {
      // Fallback if element not found
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(text, 10, 10);
      doc.save(`aman-ai-export-${Date.now()}.pdf`);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`aman-ai-export-${Date.now()}.pdf`);
    } catch (e) {
      console.error('PDF Export failed', e);
      this.uiService.showToast(this.t().exportFailed || 'فشل التصدير', 'error');
    }
  }

  async downloadGeneratedFile(file: any) {
    if (file.data) {
      const blob = this.base64ToBlob(file.data, file.mimeType || 'application/octet-stream');
      saveAs(blob, file.filename);
      return;
    }

    if (!file.content) return;

    const type = file.type?.toLowerCase();
    const filename = file.filename || 'document';

    try {
      if (type === 'pdf') {
        await this.exportToPdfFromContent(file.content, filename);
      } else if (type === 'docx') {
        await this.exportToWordFromContent(file.content, filename);
      } else {
        // Default to text
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${filename}.txt`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      this.uiService.showToast('فشل تحميل الملف', 'error');
    }
  }

  private async exportToPdfFromContent(content: string, filename: string) {
    const finalFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '800px';
    printContainer.style.padding = '40px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.color = 'black';
    printContainer.style.fontFamily = "'Amiri', 'Cairo', 'Inter', sans-serif";
    printContainer.style.direction = 'rtl';
    printContainer.style.textAlign = 'right';
    printContainer.innerHTML = marked.parse(content) as string;
    document.body.appendChild(printContainer);

    try {
      // Wait a bit for fonts to render
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(finalFilename);
    } finally {
      document.body.removeChild(printContainer);
    }
  }

  private async exportToWordFromContent(content: string, filename: string) {
    const finalFilename = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;
    const doc = new Document({
      sections: [{
        properties: {},
        children: content.split('\n').map(line => 
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: line,
                font: "Arial",
                rightToLeft: true
              }),
            ],
          })
        ),
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, finalFilename);
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  constructor() {}
}
