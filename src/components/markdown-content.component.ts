import { Component, input, signal, effect, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';
import { UiService } from '../services/ui.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-markdown-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './markdown-content.component.html'
})
export class MarkdownContentComponent {
  text = input.required<string>();
  
  translationService = inject(TranslationService);
  uiService = inject(UiService);
  
  renderedText = signal('');
  
  constructor() {
    const renderer = new marked.Renderer();
    renderer.code = (code: string, lang: string | undefined) => {
      const validLang = lang || 'code';
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      return `
        <div class="code-wrapper group my-4 rounded-xl overflow-hidden bg-[#1e1e1e] text-gray-200 border border-gray-700 relative shadow-lg" dir="ltr">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-700">
             <span class="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">${validLang}</span>
             <div class="flex items-center gap-2">
               <!-- Share Button -->
               <button type="button" class="share-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${this.translationService.t().share || 'مشاركة'}">
                 <svg class="w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                 </svg>
               </button>
               <!-- Copy Button -->
               <button type="button" class="copy-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${this.translationService.t().copyCode || 'نسخ الكود'}">
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
    marked.use({ renderer });

    effect(() => {
      const t = this.text();
      if (t) {
        marked.parse(t, { async: true }).then(raw => {
          const cleanHtml = DOMPurify.sanitize(raw, {
            ADD_TAGS: ['svg', 'path', 'button', 'div', 'span', 'pre', 'code'],
            ADD_ATTR: ['class', 'dir', 'title', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'xmlns', 'type', 'aria-hidden', 'aria-label']
          });
          this.renderedText.set(cleanHtml);
        });
      }
    });
  }

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
             this.uiService.showToast((this.translationService.t() as any).shareNotSupported || 'المشاركة غير مدعومة', 'error');
          }
        }
      }
      return;
    }
  }
}
