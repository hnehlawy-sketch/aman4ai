import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="close.emit()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            [class.bg-white]="!themeService.isDark()"
            [class.text-slate-800]="!themeService.isDark()"
            [class.bg-slate-900]="themeService.isDark()"
            [class.text-white]="themeService.isDark()"
            [class.border]="themeService.isDark()"
            [class.border-slate-800]="themeService.isDark()">
          
          <div class="flex items-center justify-between mb-4 sm:mb-6">
             <h2 class="text-lg sm:text-xl font-bold">
                {{ type() === 'privacy' ? translationService.t().infoPrivacyTitle : (type() === 'terms' ? translationService.t().infoTermsTitle : translationService.t().infoAboutTitle) }}
             </h2>
             <button (click)="close.emit()" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
               </svg>
             </button>
          </div>

          <div class="flex-1 overflow-y-auto pr-2 space-y-6 text-sm leading-relaxed opacity-90">
             @if (type() === 'privacy') {
                <div class="space-y-4">
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoPrivacy1Title }}</h3>
                      <p>{{ translationService.t().infoPrivacy1Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoPrivacy2Title }}</h3>
                      <p>{{ translationService.t().infoPrivacy2Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoPrivacy3Title }}</h3>
                      <p>{{ translationService.t().infoPrivacy3Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoPrivacy4Title }}</h3>
                      <p>{{ translationService.t().infoPrivacy4Desc }}</p>
                   </section>
                </div>
             } @else if (type() === 'terms') {
                <div class="space-y-4">
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoTerms1Title }}</h3>
                      <p>{{ translationService.t().infoTerms1Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoTerms2Title }}</h3>
                      <p>{{ translationService.t().infoTerms2Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoTerms3Title }}</h3>
                      <p>{{ translationService.t().infoTerms3Desc }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ translationService.t().infoTerms4Title }}</h3>
                      <p>{{ translationService.t().infoTerms4Desc }}</p>
                   </section>
                </div>
             } @else if (type() === 'about') {
                <div class="space-y-4 text-center py-6">
                   <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-4 sm:mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 sm:w-10 sm:h-10 text-white">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                   </div>
                   <h3 class="text-xl sm:text-2xl font-bold">{{ translationService.t().infoAboutTitle }}</h3>
                   <p class="text-base sm:text-lg opacity-70 italic">{{ translationService.t().infoAboutSubtitle }}</p>
                   <p class="max-w-md mx-auto leading-relaxed text-sm">
                      {{ translationService.t().infoAboutDesc }}
                   </p>
                   <div class="pt-6 border-t dark:border-slate-800">
                      <p class="text-xs opacity-50">{{ translationService.t().infoAboutDev }}</p>
                      <p class="text-xs opacity-50">{{ translationService.t().infoAboutVer }}</p>
                      <p class="text-xs opacity-50 mt-2 font-mono">Powered by Google</p>
                   </div>
                </div>
             }
          </div>

          <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t dark:border-slate-800 flex justify-center">
             <button (click)="close.emit()" class="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                {{ translationService.t().infoOk }}
             </button>
          </div>
       </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class InfoModalComponent {
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  type = input<'privacy' | 'terms' | 'about'>('privacy');
  title = input<string>('');
  close = output<void>();
}
