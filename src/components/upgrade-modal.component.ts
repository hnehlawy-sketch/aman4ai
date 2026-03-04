import { Component, inject, input, WritableSignal, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UiService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { translations } from '../translations';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeUpgradeModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto max-h-[90vh] sm:max-h-[85vh]"
            [class.bg-white]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.text-slate-800]="theme() === 'light'"
            [class.text-white]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <button (click)="uiService.closeUpgradeModal()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
         </button>

         <!-- Header -->
         <div class="flex flex-col items-center mb-8">
            <div class="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 relative overflow-hidden group"
                 [class.bg-gradient-to-br]="true"
                 [class.from-slate-400]="plan() === 'pro'"
                 [class.to-slate-600]="plan() === 'pro'"
                 [class.from-yellow-400]="plan() === 'premium'"
                 [class.to-yellow-600]="plan() === 'premium'">
              <div class="absolute inset-0 bg-white/20 group-hover:scale-110 transition-transform duration-700"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 relative z-10 text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                <path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd" />
              </svg>
            </div>
            <h1 class="text-3xl font-black tracking-tight text-center leading-tight">
              {{ plan() === 'pro' ? t().subscribePro : t().subscribePremium }}
            </h1>
            <div class="mt-3 px-6 py-1.5 rounded-full text-sm font-black shadow-lg border-2"
                 [class.bg-white]="theme() === 'light'"
                 [class.text-slate-700]="plan() === 'pro' && theme() === 'light'"
                 [class.border-slate-200]="plan() === 'pro' && theme() === 'light'"
                 [class.text-yellow-700]="plan() === 'premium' && theme() === 'light'"
                 [class.border-yellow-200]="plan() === 'premium' && theme() === 'light'"
                 [class.bg-slate-800]="plan() === 'pro' && theme() === 'dark'"
                 [class.text-slate-200]="plan() === 'pro' && theme() === 'dark'"
                 [class.border-slate-700]="plan() === 'pro' && theme() === 'dark'"
                 [class.bg-yellow-900/40]="plan() === 'premium' && theme() === 'dark'"
                 [class.text-yellow-200]="plan() === 'premium' && theme() === 'dark'"
                 [class.border-yellow-700/50]="plan() === 'premium' && theme() === 'dark'">
              {{ plan() === 'pro' ? t().proPrice : t().premiumPrice }}
            </div>
         </div>

         <!-- Features List -->
         <div class="mb-8 space-y-4">
           <h3 class="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1">
             {{ plan() === 'pro' ? t().proFeatures : t().premiumFeatures }}
           </h3>
           <div class="grid gap-3">
             @if (plan() === 'pro') {
               @for (feat of [t().proFeature1, t().proFeature2, t().proFeature3, t().proFeature4]; track feat) {
                 <div class="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.02]">
                   <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-slate-600 dark:text-slate-300">
                       <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                     </svg>
                   </div>
                   <span class="text-sm font-medium">{{ feat }}</span>
                 </div>
               }
             } @else {
               @for (feat of [t().premiumFeature1, t().premiumFeature2, t().premiumFeature3, t().premiumFeature4]; track feat) {
                 <div class="flex items-center gap-4 p-3 rounded-2xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 transition-all hover:scale-[1.02]">
                   <div class="w-6 h-6 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center shrink-0">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-yellow-700 dark:text-yellow-300">
                       <path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clip-rule="evenodd" />
                     </svg>
                   </div>
                   <span class="text-sm font-medium">{{ feat }}</span>
                 </div>
               }
             }
           </div>
         </div>

         <!-- Payment Form -->
         <div class="space-y-4">
            <div class="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black text-blue-600 uppercase tracking-wider">طرق الدفع</h4>
                <button (click)="loadPaymentMethods()" class="p-1.5 rounded-xl hover:bg-blue-500/10 text-blue-600 transition-all active:rotate-180 duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4" [class.animate-spin]="isSubmitting()">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
              
              <div class="space-y-3">
                @for (method of paymentMethods(); track method.id) {
                  <div class="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all">
                    <button (click)="method.expanded = !method.expanded" 
                            class="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-3">
                        @if (method.iconUrl) {
                          <img [src]="method.iconUrl" class="w-8 h-8 rounded-xl object-cover shadow-md" alt="{{ method.name }}">
                        } @else {
                          <div class="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                            </svg>
                          </div>
                        }
                        <p class="text-sm font-black">{{ method.name }}</p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 transition-transform" [class.rotate-180]="method.expanded">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    
                    @if (method.expanded) {
                      <div class="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 mb-4">
                          <p class="text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">{{ method.details }}</p>
                        </div>
                        
                        <!-- QR Code Section -->
                        <div class="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-inner min-h-[180px] justify-center">
                          @if (method.qrCodeUrl) {
                            <img [src]="method.qrCodeUrl" class="w-full max-w-[160px] mx-auto rounded-lg shadow-sm" alt="QR Code" referrerpolicy="no-referrer">
                          } @else if (method.details) {
                            <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(method.details) + '&bgcolor=ffffff&color=000000'" 
                                 class="w-full max-w-[160px] mx-auto rounded-lg shadow-sm" alt="QR Code Fallback" referrerpolicy="no-referrer">
                          } @else {
                            <div class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.125 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 17.25h.008v.008h-.008v-.008ZM17.25 14.25h.008v.008h-.008v-.008ZM14.25 17.25h.008v.008h-.008v-.008ZM14.25 14.25h.008v.008h-.008v-.008ZM17.25 20.25h.008v.008h-.008v-.008ZM14.25 20.25h.008v.008h-.008v-.008ZM20.25 17.25h.008v.008h-.008v-.008ZM20.25 14.25h.008v.008h-.008v-.008ZM20.25 20.25h.008v.008h-.008v-.008Z" />
                              </svg>
                            </div>
                          }
                          <span class="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Scan to Pay</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
              
              <p class="text-[10px] opacity-50 mt-4 text-center leading-relaxed">{{ t().paymentStep3 }}</p>
            </div>

            @if (paymentSubmitted()) {
              <div class="p-5 rounded-3xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-bold border border-green-100 dark:border-green-800 flex items-center gap-3 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
                </svg>
                {{ t().paymentPending }}
              </div>
            } @else {
              <div class="space-y-4">
                <div class="relative">
                  <input [value]="transactionId()" (input)="transactionId.set($any($event.target).value)" 
                         type="text" 
                         [placeholder]="t().transactionId"
                         class="w-full px-5 py-4 rounded-2xl border text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all pr-12"
                         [class.bg-white]="theme() === 'light'"
                         [class.bg-slate-900]="theme() === 'dark'"
                         [class.border-gray-200]="theme() === 'light'"
                         [class.border-slate-700]="theme() === 'dark'">
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h9m-6.75-12.75H18.75c.621 0 1.125.504 1.125 1.125v17.25c0 .621-.504 1.125-1.125 1.125H5.25a1.125 1.125 0 0 1-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h6.75Z" />
                    </svg>
                  </div>
                </div>

                <label class="flex items-center gap-3 p-4 rounded-2xl border border-dashed cursor-pointer hover:bg-blue-500/5 transition-all group"
                       [class.border-gray-200]="theme() === 'light'"
                       [class.border-slate-700]="theme() === 'dark'">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 opacity-50">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-bold">{{ receiptFile() ? receiptFile()?.name : t().attachReceipt }}</span>
                    <span class="text-[10px] opacity-40">{{ t().attachReceiptHint || 'PNG, JPG up to 5MB' }}</span>
                  </div>
                  <input type="file" class="hidden" accept="image/*" (change)="onReceiptSelected($event)">
                </label>
                
                <button (click)="submitPayment()"
                        [disabled]="!transactionId() || isSubmitting()"
                        class="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none">
                  @if (isSubmitting()) {
                    <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
       </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class UpgradeModalComponent {
  uiService = inject(UiService);
  authService = inject(AuthService);
  
  t = input<any>(translations.ar);
  theme = input<'light' | 'dark'>('light');
  plan = input<'pro' | 'premium' | null>(null);

  paymentMethods = signal<any[]>([]);
  transactionId = signal('');
  receiptFile = signal<File | null>(null);
  isSubmitting = signal(false);
  paymentSubmitted = signal(false);

  encodeURIComponent = encodeURIComponent;

  constructor() {
    this.loadPaymentMethods();
  }

  async loadPaymentMethods() {
    try {
      const methods = await this.authService.getPaymentMethods();
      if (methods.length === 0) {
        this.paymentMethods.set([{
          id: 'fallback',
          name: 'شام كاش (Sham Cash)',
          details: 'يرجى التواصل مع الدعم للحصول على رقم المحفظة',
          isActive: true
        }]);
      } else {
        this.paymentMethods.set(methods);
      }
    } catch (e) {
      console.error('Failed to load payment methods', e);
    }
  }

  onReceiptSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.receiptFile.set(file);
  }

  async submitPayment() {
    if (!this.transactionId()) return;
    this.isSubmitting.set(true);
    try {
      let receiptUrl = '';
      if (this.receiptFile()) {
        const user = this.authService.user();
        if (user) {
          receiptUrl = await this.authService.uploadPaymentReceipt(user.uid, this.receiptFile()!);
        }
      }
      await this.authService.submitPaymentRequest(this.transactionId(), receiptUrl, this.plan() || 'premium');
      this.paymentSubmitted.set(true);
      this.transactionId.set('');
      this.receiptFile.set(null);
    } catch (e) {
      console.error('Payment submission failed', e);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
