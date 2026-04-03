import { Component, input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-image-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-4 grid gap-4"
         [class.grid-cols-1]="images()!.length === 1"
         [class.grid-cols-2]="images()!.length > 1">
      
      @for (img of images(); track $index) {
        <div class="relative group rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 transition-all duration-500 hover:shadow-2xl">
          
          <!-- Image Container -->
          <div class="relative w-full overflow-hidden flex items-center justify-center bg-black/5 min-h-[200px] rounded-xl">
             
            @if (img.url) {
                <img [src]="img.url" 
                     [alt]="img.alt || 'Generated Image'" 
                     class="w-full h-auto max-h-[500px] object-contain transition-transform duration-700 group-hover:scale-105"
                     loading="eager"
                     referrerpolicy="no-referrer">
                
                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <!-- Aman Logo Watermark (Bottom Right) -->
                <div class="absolute bottom-3 right-3 z-20 pointer-events-none opacity-90">
                  <div class="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1.5 shadow-sm">
                     <div class="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center text-white shadow-sm">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                         <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
                       </svg>
                     </div>
                     <span class="text-[10px] font-bold text-white drop-shadow-md">Aman AI</span>
                  </div>
                </div>
            } @else if (img.isPending) {
                <!-- Loading State (Horizontal Premium Design - Ultra Wide) -->
                <div class="flex flex-col lg:flex-row items-center justify-between gap-8 p-8 sm:p-12 w-full min-h-[240px] rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/30 border border-slate-200/60 dark:border-slate-700/40 relative overflow-hidden group/loading shadow-2xl shadow-blue-500/5">
                    
                    <!-- Animated Background Elements -->
                    <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer"></div>
                    <div class="absolute -inset-[100%] opacity-[0.05] dark:opacity-[0.08] bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:32px_32px]"></div>

                    <!-- Text Content (Left Side) -->
                    <div class="flex flex-col items-center lg:items-start gap-4 z-10 flex-1 text-center lg:text-right">
                      <div class="flex items-center gap-4">
                        <div class="w-2.5 h-10 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                        <h4 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-700 dark:from-white dark:via-blue-400 dark:to-slate-400 tracking-tight">
                          {{ translationService.t().generatingImage }}
                        </h4>
                      </div>
                      <p class="text-base text-slate-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                        {{ translationService.t().generatingImageDesc }}
                      </p>
                      
                      <div class="flex items-center gap-3 mt-4 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-white/50 dark:border-white/5">
                        <div class="flex gap-1.5">
                          <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                          <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce"></span>
                        </div>
                        <span class="text-sm text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase">{{ translationService.t().pleaseWait }}</span>
                      </div>
                    </div>

                    <!-- Center Logo Animation (Right Side) -->
                    <div class="relative flex-shrink-0 lg:ml-12">
                        <!-- Premium Glow Effects -->
                        <div class="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full animate-pulse"></div>
                        <div class="absolute inset-0 bg-indigo-500/10 blur-[40px] rounded-full animate-pulse [animation-delay:0.7s]"></div>
                        
                        <!-- Main Spinner Container -->
                        <div class="relative w-44 h-44 flex items-center justify-center">
                            <!-- Outer Rotating Ring (SVG) -->
                            <div class="absolute inset-0 animate-[spin_4s_linear_infinite]">
                              <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <!-- Background Track -->
                                <circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="1" class="text-blue-100/30 dark:text-blue-900/10" />
                                <!-- Animated Arc -->
                                <circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="70 210" class="text-blue-600 dark:text-blue-400" />
                              </svg>
                            </div>

                            <!-- Inner Rotating Dotted Ring -->
                            <div class="absolute inset-6 animate-[spin_10s_linear_infinite_reverse]">
                              <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="1" stroke-dasharray="4 12" class="text-indigo-300/40 dark:text-indigo-700/20" />
                              </svg>
                            </div>

                            <!-- Jumping Aman Logo (Perfectly Centered) -->
                            <div class="relative z-10 animate-bounce [animation-duration:1.8s]">
                              <div class="w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-500 dark:via-blue-600 dark:to-indigo-700 rounded-[30px] flex items-center justify-center text-white shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] rotate-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-11 h-11">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5V9h9V6a4.5 4.5 0 0 0-4.5-4.5ZM12 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM3 9h18v10.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9Z" />
                                </svg>
                              </div>
                            </div>
                        </div>
                    </div>
                </div>
            } @else {
                <!-- Error State -->
                <div class="flex flex-col items-center justify-center gap-2 py-10 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 opacity-50">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span class="text-xs">{{ translationService.t().imageLoadFailed }}</span>
                </div>
            }
          </div>
          
          <!-- Actions Overlay (Centered) -->
          @if (img.url) {
              <div class="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                
                <button (click)="onDownload.emit(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="Download">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" transform="rotate(-90 12 12)" />
                  </svg>
                </button>

                <button (click)="uiService.openImageView(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="View Full Screen">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>

                <button (click)="onShare.emit(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="Share Image">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                </button>

              </div>
          }

          <!-- Prompt Tooltip (Optional) -->
          <div class="absolute bottom-4 left-4 right-32 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-10 pointer-events-none">
             <p class="text-[10px] text-white/80 line-clamp-2 font-medium drop-shadow-md">{{ img.alt || prompt() }}</p>
          </div>
        </div>
      }
    </div>
  `
})
export class ImageGridComponent {
  images = input.required<any[] | undefined>();
  prompt = input<string>('');
  translationService = inject(TranslationService);
  uiService = inject(UiService);

  onDownload = output<string>();
  onShare = output<string>();
}
