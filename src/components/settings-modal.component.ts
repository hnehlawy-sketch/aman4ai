import { Component, inject, input, WritableSignal, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { translations } from '../translations';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeSettingsModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto max-h-[90vh] sm:max-h-[85vh]"
            [class.bg-white]="themeSignal()() === 'light'"
            [class.bg-slate-900]="themeSignal()() === 'dark'"
            [class.border]="themeSignal()() === 'dark'"
            [class.border-slate-800]="themeSignal()() === 'dark'">
         
         <button (click)="uiService.closeSettingsModal()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
             <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
           </svg>
         </button>

         <!-- Header -->
         <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center shadow-lg mb-4 text-blue-500 border border-blue-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 0 0 2.572-1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
              </svg>
            </div>
            <h1 class="text-xl font-bold text-slate-800 dark:text-white">{{ t().settings }}</h1>
         </div>

         <!-- Settings List -->
         <div class="space-y-2">
           <!-- User Personalization -->

           <!-- User Personalization -->
           <button (click)="uiService.openPersonalizationModal()" class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border dark:border-slate-800">
             <div class="flex items-center gap-3">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 opacity-70">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                 </svg>
                 <span class="text-sm">{{ t().personalization }}</span>
             </div>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 opacity-50">
               <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
             </svg>
           </button>

            <!-- Language Toggle -->
           <button (click)="toggleLang()" class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border dark:border-slate-800">
               <div class="flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 opacity-70">
                     <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                   </svg>
                   <span class="text-sm">{{ t().language }}</span>
               </div>
               <span class="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                 {{ langSignal()() === 'ar' ? 'العربية' : 'English' }}
               </span>
           </button>

           <!-- Theme Toggle -->
           <button (click)="toggleTheme()" class="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border dark:border-slate-800">
               <div class="flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 opacity-70">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                   </svg>
                   <span class="text-sm">{{ t().darkMode }}</span>
               </div>
               <div class="w-10 h-5 rounded-full relative transition-colors duration-300"
                    [class.bg-gray-300]="themeSignal()() === 'light'"
                    [class.bg-blue-500]="themeSignal()() === 'dark'">
                  <div class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm"
                       [class.left-0.5]="themeSignal()() === 'light'"
                       [class.translate-x-5]="themeSignal()() === 'dark'"
                       [class.left-0.5]="themeSignal()() === 'dark'"></div>
               </div>
           </button>

           <!-- Export Chat -->
           <button (click)="uiService.openExportModal(); uiService.closeSettingsModal()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border dark:border-slate-800">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 opacity-70">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
               </svg>
               <span class="text-sm">{{ t().export }}</span>
           </button>

           <!-- Admin Panel -->
           @if (authService.isAdmin()) {
             <button (click)="uiService.openAdminPanel(); uiService.closeSettingsModal()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                 </svg>
                 <span class="text-sm">{{ t().adminPanel }}</span>
             </button>
           }
         </div>
       </div>
    </div>
  `
})
export class SettingsModalComponent {
  uiService = inject(UiService);
  authService = inject(AuthService);
  
  t = input<any>(translations.ar);
  themeSignal = input<WritableSignal<'light' | 'dark'>>(signal('light') as any);
  langSignal = input<WritableSignal<'ar' | 'en'>>(signal('ar') as any);
  modelSignal = input<WritableSignal<'fast' | 'core' | 'pro'>>(signal('fast') as any);

  toggleLang() {
    this.langSignal().update(l => l === 'ar' ? 'en' : 'ar');
  }

  toggleTheme() {
    this.themeSignal().update(t => {
      const newT = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('aman_theme', newT);
      return newT;
    });
  }
}
