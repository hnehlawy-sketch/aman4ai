import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex w-full mb-6" [class.justify-start]="currentLang() === 'en'" [class.justify-end]="currentLang() === 'ar'">
      <div class="flex flex-col gap-3 max-w-[90%] sm:max-w-[80%]">
        
        <!-- Loading Content -->
        @if (generateImage()) {
          <!-- Image Generation Placeholder (Aesthetic) -->
          <div class="w-full max-w-md aspect-square rounded-3xl relative overflow-hidden shadow-2xl animate-pulse group">
            <!-- Animated Gradient Background -->
            <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-xy"></div>
            
            <!-- Glassmorphism Container -->
            <div class="absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-6">
              
              <!-- Floating Icon -->
              <div class="relative">
                <div class="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
                <div class="w-20 h-20 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-xl flex items-center justify-center relative z-10 animate-bounce-slow">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="url(#paintGradient)" class="w-10 h-10">
                    <defs>
                      <linearGradient id="paintGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#3b82f6" />
                        <stop offset="100%" stop-color="#a855f7" />
                      </linearGradient>
                    </defs>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
              </div>

              <!-- Text & Loading Dots -->
              <div class="flex flex-col items-center gap-2 relative z-10">
                <h3 class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                  {{ t().generatingImage || 'جاري رسم خيالك...' }}
                </h3>
                <div class="flex gap-1.5">
                  <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div class="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
            
            <!-- Border Gradient -->
            <div class="absolute inset-0 border-2 border-transparent rounded-3xl [background:linear-gradient(45deg,#3b82f6,#a855f7)_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:destination-out] mask-composite:exclude opacity-50"></div>
          </div>
        } @else {
          <!-- Glowing Wave Logo Loading -->
          <div class="w-10 h-10 relative flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="w-8 h-8 drop-shadow-md">
              <defs>
                <linearGradient id="waveLoading" x1="0%" y1="0%" x2="200%" y2="200%">
                  <stop offset="0%" stop-color="#3b82f6">
                    <animate attributeName="stop-color" values="#3b82f6;#93c5fd;#3b82f6" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stop-color="#ffffff">
                    <animate attributeName="stop-color" values="#ffffff;#eff6ff;#ffffff" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stop-color="#3b82f6">
                    <animate attributeName="stop-color" values="#3b82f6;#93c5fd;#3b82f6" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <path fill="url(#waveLoading)" stroke="none" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <!-- Glow Effect -->
            <div class="absolute inset-0 bg-blue-500/10 blur-lg rounded-full animate-pulse"></div>
          </div>
        }
      </div>
    </div>
  `
})
export class LoadingIndicatorComponent {
  currentLang = input<'ar' | 'en'>('ar');
  generateImage = input<boolean>(false);
  t = input<any>({});
}
