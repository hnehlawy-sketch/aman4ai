import { Component, inject, input, WritableSignal, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeSettingsModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto max-h-[90vh]"
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
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center shadow-lg mb-4 text-orange-500 border border-orange-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 0 0 2.572-1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
              </svg>
            </div>
            <h1 class="text-xl font-bold">{{ t().settings }}</h1>
         </div>

         <!-- Settings List -->
         <div class="space-y-2">
           <!-- Premium Section -->
           <div class="mb-4">
             @if (authService.isPremium()) {
               <div class="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg flex items-center gap-3">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                   <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" />
                 </svg>
                 <span class="font-bold text-sm">{{ t().isPremiumUser }}</span>
               </div>
             } @else {
               <button (click)="showUpgradeForm.set(!showUpgradeForm())" 
                       class="w-full p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 flex items-center justify-between group transition-all">
                 <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                       <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                     </svg>
                   </div>
                   <div class="text-left">
                     <p class="font-bold text-sm">{{ t().upgradePremium }}</p>
                     <p class="text-[10px] opacity-70">{{ t().premiumSoon }}</p>
                   </div>
                 </div>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 transition-transform" [class.rotate-90]="showUpgradeForm()">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                 </svg>
               </button>

               @if (showUpgradeForm()) {
                 <div class="mt-3 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 animate-slide-up">
                    <h3 class="text-xs font-bold uppercase tracking-wider opacity-60 mb-3">{{ t().premiumFeatures }}</h3>
                    <ul class="space-y-2 mb-6">
                      <li class="flex items-center gap-2 text-xs opacity-80">
                        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        {{ t().premiumFeature1 }}
                      </li>
                      <li class="flex items-center gap-2 text-xs opacity-80">
                        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        {{ t().premiumFeature2 }}
                      </li>
                      <li class="flex items-center gap-2 text-xs opacity-80">
                        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        {{ t().premiumFeature3 }}
                      </li>
                    </ul>

                    <div class="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
                      <h4 class="text-xs font-bold text-orange-600 mb-2">{{ t().paymentInstructions }}</h4>
                      <p class="text-[11px] leading-relaxed opacity-80 mb-3">{{ t().paymentStep1 }}</p>
                      
                      <div class="flex flex-col items-center gap-2 mb-4">
                         <div class="p-2 bg-white rounded-2xl shadow-md border border-orange-100">
                            <!-- Dynamic QR Code -->
                            <img [src]="systemSettings().qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SHAM_CASH_QR_PLACEHOLDER'" 
                                 [alt]="t().paymentStep2"
                                 class="w-32 h-32 object-contain">
                         </div>
                         <span class="text-[10px] font-bold opacity-50">{{ t().paymentStep2 }}</span>
                      </div>

                      <p class="text-[11px] leading-relaxed opacity-80">{{ t().paymentStep3 }}</p>
                    </div>

                    @if (paymentSubmitted()) {
                      <div class="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium border border-green-100 dark:border-green-800">
                        {{ t().paymentPending }}
                      </div>
                    } @else {
                      <div class="space-y-3">
                        <input [(ngModel)]="transactionId" 
                               type="text" 
                               [placeholder]="t().transactionId"
                               class="w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                               [class.bg-white]="themeSignal()() === 'light'"
                               [class.bg-slate-900]="themeSignal()() === 'dark'"
                               [class.border-gray-200]="themeSignal()() === 'light'"
                               [class.border-slate-700]="themeSignal()() === 'dark'">
                        
                        <button (click)="submitPayment()"
                                [disabled]="!transactionId || isSubmitting()"
                                class="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50">
                          @if (isSubmitting()) {
                            <svg class="animate-spin h-4 w-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          } @else {
                            {{ t().submitPayment }}
                          }
                        </button>
                      </div>
                    }
                 </div>
               }
             }
           </div>

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
               <span class="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
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
               <div class="w-8 h-4 bg-gray-300 dark:bg-gray-600 rounded-full relative transition-colors">
                  <div class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300"
                       [class.left-0.5]="langSignal()() === 'en' && themeSignal()() === 'light'"
                       [class.right-0.5]="langSignal()() === 'en' && themeSignal()() === 'dark'"
                       [class.right-0.5]="langSignal()() === 'ar' && themeSignal()() === 'light'"
                       [class.left-0.5]="langSignal()() === 'ar' && themeSignal()() === 'dark'"></div>
               </div>
           </button>
         </div>
       </div>
    </div>
  `
})
export class SettingsModalComponent implements OnInit {
  uiService = inject(UiService);
  authService = inject(AuthService);
  
  t = input.required<any>();
  themeSignal = input.required<WritableSignal<'light' | 'dark'>>();
  langSignal = input.required<WritableSignal<'ar' | 'en'>>();
  modelSignal = input.required<WritableSignal<'fast' | 'core' | 'pro'>>();

  showUpgradeForm = signal(false);
  transactionId = '';
  isSubmitting = signal(false);
  qrPreview = signal<string | null>(null);
  isUploadingQr = signal(false);
  paymentSubmitted = signal(false);
  systemSettings = signal<any>({});

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settings = await this.authService.getSystemSettings();
      this.systemSettings.set(settings);
    } catch (e) {
      console.error('Failed to load system settings', e);
    }
  }
  
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

  async submitPayment() {
    if (!this.transactionId) return;
    this.isSubmitting.set(true);
    try {
      await this.authService.submitPaymentRequest(this.transactionId);
      this.paymentSubmitted.set(true);
      this.transactionId = '';
    } catch (e) {
      console.error('Payment submission failed', e);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
