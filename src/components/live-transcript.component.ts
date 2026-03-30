import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-live-transcript',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-2xl text-center space-y-4 min-h-[120px] flex flex-col justify-end">
      <p class="text-2xl sm:text-4xl font-light leading-tight tracking-tight text-white/90 transition-all duration-300"
         [class.opacity-50]="state() === 'speaking'">
        {{ finalTranscript() }}
        <span class="text-white/50">{{ interimTranscript() }}</span>
      </p>
      
      @if (!finalTranscript() && !interimTranscript() && state() === 'listening') {
        <p class="text-xl text-white/40 font-light animate-pulse">{{ translationService.t().listening || 'أنا أستمع إليك...' }}</p>
      }
      @if (state() === 'error') {
        <p class="text-xl text-red-400 font-light">{{ error() || translationService.t().liveError }}</p>
      }
    </div>
  `
})
export class LiveTranscriptComponent {
  translationService = inject(TranslationService);
  state = input<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  finalTranscript = input<string>('');
  interimTranscript = input<string>('');
  error = input<string>('');
}
