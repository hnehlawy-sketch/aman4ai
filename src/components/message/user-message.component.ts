import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../services/gemini.service';
import { UiService } from '../../services/ui.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'flex w-full',
    '[class.justify-end]': 'currentLang() === "en"',
    '[class.justify-start]': 'currentLang() === "ar"'
  },
  template: `
    <div class="max-w-[85%] sm:max-w-[75%] flex flex-col animate-slide-up relative group"
         [class.items-end]="currentLang() === 'en'"
         [class.items-start]="currentLang() === 'ar'"
         [dir]="'auto'"
         (touchstart)="onTouchStart()" 
         (touchend)="onTouchEnd()" 
         (touchcancel)="onTouchEnd()" 
         (touchmove)="onTouchEnd()">
      
      <div class="flex items-end gap-2 mb-1"
           [class.flex-row]="currentLang() === 'en'"
           [class.flex-row-reverse]="currentLang() === 'ar'">
        <div class="rounded-[1.5rem] px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm relative text-start"
             [class.rounded-br-sm]="currentLang() === 'en'"
             [class.rounded-bl-sm]="currentLang() === 'ar'">
          @for (file of message().files; track file.name) {
            @if (file.mimeType.startsWith('image/')) {
              <div class="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-[200px] sm:max-w-xs relative group/img cursor-pointer" (click)="file.url ? uiService.openImageView(file.url) : null">
                <img [src]="file.url || ('data:' + file.mimeType + ';base64,' + file.data)" [alt]="file.name" class="w-full h-auto object-cover">
                @if (file.url) {
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-white">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </div>
                }
              </div>
            } @else {
              <div class="mb-2 p-2 rounded-xl flex items-center gap-3 bg-white/10 border border-white/10">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold uppercase text-white">
                  {{ file.mimeType.split('/')[1] || 'FILE' }}
                </div>
                <div class="overflow-hidden text-right">
                  <p class="text-xs truncate font-medium text-white">{{ file.name }}</p>
                </div>
              </div>
            }
          }
          
          @if (isEditing()) {
            <textarea 
              class="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none mt-1"
              rows="3"
              [value]="editValue()"
              (input)="editValue.set($any($event.target).value)"
              dir="auto"
            ></textarea>
            <div class="flex justify-end gap-2 mt-2">
              <button (click)="cancelEdit()" class="px-3 py-1 text-xs rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300">{{ t().cancel || 'إلغاء' }}</button>
              <button (click)="saveEdit()" class="px-3 py-1 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">{{ t().save || 'حفظ' }}</button>
            </div>
          } @else {
            <div class="whitespace-pre-wrap leading-7 text-base font-normal">
              {{ message().text }}
            </div>
            
            @if (message().isEdited) {
              <div class="text-[10px] opacity-50 mt-1 italic text-left">{{ t().edited || 'تم التعديل' }}</div>
            }
          }
        </div>
      </div>
      
      <!-- User Actions (Edit/Delete/Share) -->
      @if (!isEditing()) {
        <div class="flex gap-1 transition-opacity no-print mt-1 z-10"
             [class.opacity-0]="!showMobileActions()"
             [class.opacity-100]="showMobileActions()"
             class="sm:opacity-0 sm:group-hover:opacity-100">
          @if (isConfirmingDelete()) {
            <div class="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-xl border border-red-100 dark:border-red-900/50">
              <span class="text-[10px] text-red-600 dark:text-red-400 font-medium px-1">{{ t().deleteConfirm || 'تأكيد الحذف؟' }}</span>
              <button (click)="executeDelete()" class="p-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
              </button>
              <button (click)="cancelDelete()" class="p-1 rounded-lg bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          } @else {
            <button (click)="shareText()" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors" title="Share">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </button>
            <button (click)="startEdit()" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
            <button (click)="confirmDelete()" class="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class UserMessageComponent {
  translationService = inject(TranslationService);
  public uiService = inject(UiService);
  
  message = input.required<ChatMessage>();
  
  t = computed(() => this.translationService.t());
  currentLang = computed(() => this.translationService.currentLang());
  
  onEdit = output<ChatMessage>();
  onDelete = output<string>();

  isEditing = signal(false);
  editValue = signal('');
  isConfirmingDelete = signal(false);
  showMobileActions = signal(false);
  private pressTimer: any;

  onTouchStart() {
    this.pressTimer = setTimeout(() => {
      this.showMobileActions.set(true);
      setTimeout(() => this.showMobileActions.set(false), 5000);
    }, 500);
  }

  onTouchEnd() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
    }
  }

  startEdit() {
    this.editValue.set(this.message().text);
    this.isEditing.set(true);
  }

  saveEdit() {
    const newText = this.editValue().trim();
    if (newText && newText !== this.message().text) {
      this.onEdit.emit({ ...this.message(), text: newText, isEdited: true });
    }
    this.isEditing.set(false);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  confirmDelete() {
    this.isConfirmingDelete.set(true);
  }

  executeDelete() {
    this.onDelete.emit(this.message().id);
    this.isConfirmingDelete.set(false);
  }

  cancelDelete() {
    this.isConfirmingDelete.set(false);
  }

  shareText() {
    const text = this.message().text;
    if (text) {
      if (navigator.share) {
        navigator.share({
          title: 'Aman AI User Message',
          text: text
        }).catch(err => console.error('Error sharing:', err));
      } else {
        navigator.clipboard.writeText(text).then(() => {
          this.uiService.showToast(this.t().copySuccess || 'تم النسخ', 'success');
        });
      }
    }
  }
}
