import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-live-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative z-10 p-8 flex justify-center items-center gap-6">
      @if (state() === 'speaking') {
        <button (click)="interrupt.emit()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all group">
          <div class="w-4 h-4 bg-white rounded-sm group-hover:scale-90 transition-transform"></div>
        </button>
      }
      
      <button (click)="mainAction.emit()" 
              class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl"
              [class.bg-white]="state() === 'idle' || state() === 'error'"
              [class.text-black]="state() === 'idle' || state() === 'error'"
              [class.bg-red-500]="state() === 'listening' || state() === 'speaking'"
              [class.text-white]="state() === 'listening' || state() === 'speaking'"
              [class.hover:scale-105]="true"
              [class.active:scale-95]="true">
        
        @if (state() === 'idle' || state() === 'error') {
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

      <!-- Voice Selector (Overlay) -->
      @if (showVoiceSelector()) {
        <div class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
          <h3 class="text-lg font-bold mb-4">{{ translationService.t().voicePreference || 'تفضيل الصوت' }}</h3>
          <div class="flex gap-4">
            <button (click)="selectVoice.emit('Puck')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
              <span class="text-3xl">👨</span>
              <span class="text-sm font-medium">{{ translationService.t().voiceMale || 'صوت شاب' }}</span>
            </button>
            <button (click)="selectVoice.emit('Kore')" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
              <span class="text-3xl">👩</span>
              <span class="text-sm font-medium">{{ translationService.t().voiceFemale || 'صوت فتاة' }}</span>
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class LiveControlsComponent {
  translationService = inject(TranslationService);
  state = input<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  showVoiceSelector = input<boolean>(false);
  
  interrupt = output<void>();
  mainAction = output<void>();
  selectVoice = output<'Puck' | 'Kore'>();
}
