import { Component, inject, input, WritableSignal, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { UiService } from '../services/ui.service';
import { AuthService } from '../services/auth.service';
import { translations } from '../translations';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto animate-[fadeIn_0.2s_ease-out] font-sans"
         [class.text-slate-800]="theme() === 'light'"
         [class.text-white]="theme() === 'dark'">
         
      <!-- Header -->
      <div class="sticky top-0 z-20 flex items-center justify-between p-3 sm:p-4 sm:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <mat-icon class="text-sm sm:text-base">workspace_premium</mat-icon>
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-black tracking-tight leading-none">{{ t().upgradeToPro || 'الاشتراكات' }}</h1>
            <p class="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1">Premium Experience</p>
          </div>
        </div>
        <button (click)="uiService.closeUpgradeModal()" class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
          <mat-icon style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">close</mat-icon>
        </button>
      </div>

      <div class="flex-1 flex flex-col">
        
        @if (!selectedPlanForPayment()) {
          <!-- Plans Selection -->
          <div class="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col justify-center">
            <div class="text-center mb-8 sm:mb-12 animate-[slideUp_0.3s_ease-out]">
              <span class="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3 sm:mb-4">
                {{ t().choosePlan || 'اختر خطتك' }}
              </span>
              <h2 class="text-3xl sm:text-5xl font-black mb-3 sm:mb-4 tracking-tight leading-tight">{{ t().planTitle || 'ارتقِ بذكائك الاصطناعي' }}</h2>
              <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto px-4">{{ t().planDesc || 'اختر الباقة التي تناسب احتياجاتك واستمتع بميزات حصرية وقوة معالجة فائقة.' }}</p>
              
              <!-- Billing Toggle -->
              <div class="mt-8 sm:mt-10 inline-flex items-center p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                <button (click)="billingCycle.set('monthly')" 
                        class="px-5 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-300"
                        [class.bg-white]="billingCycle() === 'monthly' && theme() === 'light'"
                        [class.bg-slate-700]="billingCycle() === 'monthly' && theme() === 'dark'"
                        [class.text-blue-600]="billingCycle() === 'monthly'"
                        [class.shadow-lg]="billingCycle() === 'monthly'">
                  {{ t().monthly || 'شهري' }}
                </button>
                <button (click)="billingCycle.set('yearly')" 
                        class="px-5 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-300 flex items-center gap-1.5 sm:gap-2"
                        [class.bg-white]="billingCycle() === 'yearly' && theme() === 'light'"
                        [class.bg-slate-700]="billingCycle() === 'yearly' && theme() === 'dark'"
                        [class.text-blue-600]="billingCycle() === 'yearly'"
                        [class.shadow-lg]="billingCycle() === 'yearly'">
                  {{ t().yearly || 'سنوي' }}
                  <span class="text-[8px] sm:text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-md">-20%</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:gap-8 max-w-5xl mx-auto w-full animate-[slideUp_0.4s_ease-out]">
              <!-- Pro Plan -->
              <div class="group relative p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col overflow-hidden"
                   [class.border-slate-200]="theme() === 'light'"
                   [class.border-slate-800]="theme() === 'dark'"
                   [class.bg-white]="theme() === 'light'"
                   [class.bg-slate-900/50]="theme() === 'dark'">
                
                <div class="absolute top-0 right-0 p-6 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <mat-icon class="text-6xl sm:text-8xl w-16 h-16 sm:w-24 sm:h-24">auto_awesome</mat-icon>
                </div>

                <div class="mb-6 sm:mb-8">
                  <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 sm:mb-4">
                    <mat-icon class="text-slate-600 dark:text-slate-400" style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">bolt</mat-icon>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-black mb-1 sm:mb-2">Pro</h3>
                  <p class="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">مثالي للمستخدمين النشطين والطلاب</p>
                  <div class="flex items-baseline gap-1.5 sm:gap-2">
                    <span class="text-4xl sm:text-5xl font-black tracking-tighter">{{ getPrice('pro', 'usd') }}$</span>
                    <span class="text-slate-500 text-xs sm:text-sm font-bold">/ {{ billingCycle() === 'monthly' ? (t().month || 'شهر') : (t().year || 'سنة') }}</span>
                  </div>
                  <div class="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-1.5 sm:mt-2">أو {{ getPrice('pro', 'syp') }} ل.س</div>
                </div>
                
                <div class="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-1">
                  @for (feat of [t().proFeature1, t().proFeature2, t().proFeature3, t().proFeature4]; track feat) {
                    <div class="flex items-center gap-2.5 sm:gap-3">
                      <div class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <mat-icon class="text-[10px] sm:text-[14px] text-blue-600 dark:text-blue-400 w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center">check</mat-icon>
                      </div>
                      <span class="text-xs sm:text-sm font-bold opacity-80">{{ feat }}</span>
                    </div>
                  }
                </div>
                
                <button (click)="selectPlan('pro')" class="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm sm:text-base hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5">
                  {{ t().subscribePro || 'اشترك في Pro' }}
                </button>
              </div>

              <!-- Premium Plan -->
              <div class="group relative p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-blue-600 shadow-xl sm:shadow-2xl shadow-blue-500/10 sm:shadow-blue-500/20 transition-all duration-500 hover:-translate-y-1 flex flex-col overflow-hidden"
                   [class.bg-white]="theme() === 'light'"
                   [class.bg-slate-900]="theme() === 'dark'">
                
                <div class="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <mat-icon class="text-6xl sm:text-8xl w-16 h-16 sm:w-24 sm:h-24 text-blue-600">stars</mat-icon>
                </div>

                <div class="absolute -top-px left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 sm:px-6 py-1 sm:py-1.5 rounded-b-xl sm:rounded-b-2xl text-[8px] sm:text-[10px] font-black tracking-widest uppercase shadow-lg">
                  الأكثر طلباً
                </div>

                <div class="mb-6 sm:mb-8">
                  <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-blue-500/30">
                    <mat-icon class="text-white" style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">workspace_premium</mat-icon>
                  </div>
                  <h3 class="text-xl sm:text-2xl font-black mb-1 sm:mb-2 text-blue-600 dark:text-blue-400">Premium</h3>
                  <p class="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">للمحترفين والشركات الباحثين عن الأفضل</p>
                  <div class="flex items-baseline gap-1.5 sm:gap-2">
                    <span class="text-4xl sm:text-5xl font-black tracking-tighter">{{ getPrice('premium', 'usd') }}$</span>
                    <span class="text-slate-500 text-xs sm:text-sm font-bold">/ {{ billingCycle() === 'monthly' ? (t().month || 'شهر') : (t().year || 'سنة') }}</span>
                  </div>
                  <div class="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-1.5 sm:mt-2">أو {{ getPrice('premium', 'syp') }} ل.س</div>
                </div>
                
                <div class="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-1">
                  @for (feat of [t().premiumFeature1, t().premiumFeature2, t().premiumFeature3, t().premiumFeature4]; track feat) {
                    <div class="flex items-center gap-2.5 sm:gap-3">
                      <div class="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <mat-icon class="text-[10px] sm:text-[14px] text-white w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center">check</mat-icon>
                      </div>
                      <span class="text-xs sm:text-sm font-bold">{{ feat }}</span>
                    </div>
                  }
                </div>
                
                <button (click)="selectPlan('premium')" class="w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-blue-600 text-white font-black text-sm sm:text-base hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/30">
                  {{ t().subscribePremium || 'اشترك في Premium' }}
                </button>
              </div>
            </div>

            <p class="text-center text-slate-400 text-[10px] sm:text-xs mt-8 sm:mt-12 font-medium px-6">
              جميع المدفوعات آمنة ومشفرة. يمكنك إلغاء الاشتراك في أي وقت.
            </p>
          </div>
        } @else {
          <!-- Payment Page (Responsive Layout) -->
          <div class="flex-1 flex flex-col lg:flex-row animate-[fadeIn_0.4s_ease-out]">
            
            <!-- Mobile Order Summary (Collapsible/Compact) -->
            <div class="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10 shadow-sm">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px;">{{ selectedPlanForPayment() === 'premium' ? 'stars' : 'bolt' }}</mat-icon>
                  </div>
                  <div>
                    <div class="text-sm font-black capitalize">{{ selectedPlanForPayment() }} Plan</div>
                    <div class="text-[10px] font-bold text-blue-600 dark:text-blue-400">{{ getPrice(selectedPlanForPayment()!, 'usd') }}$ / {{ getPrice(selectedPlanForPayment()!, 'syp') }} ل.س</div>
                  </div>
                </div>
                <button (click)="selectedPlanForPayment.set(null)" class="text-[10px] font-black text-slate-400 flex flex-col items-center">
                  <mat-icon style="font-size: 18px; width: 18px; height: 18px;">edit</mat-icon>
                  <span>تغيير</span>
                </button>
              </div>
            </div>

            <!-- Left Side: Payment Form -->
            <div class="flex-1 p-5 sm:p-12 lg:p-16 overflow-y-auto">
              <div class="max-w-2xl mx-auto">
                <button (click)="selectedPlanForPayment.set(null)" class="hidden lg:flex mb-10 items-center gap-2 text-sm font-black text-slate-400 hover:text-blue-600 transition-colors group">
                  <mat-icon class="transition-transform group-hover:translate-x-1" style="font-size: 20px; width: 20px; height: 20px;">arrow_forward</mat-icon>
                  {{ t().back || 'العودة لاختيار الخطة' }}
                </button>

                <div class="mb-8 sm:mb-12">
                  <h2 class="text-2xl sm:text-4xl font-black mb-2 sm:mb-4 tracking-tight">{{ t().paymentDetails || 'إتمام عملية الدفع' }}</h2>
                  <p class="text-sm sm:text-lg text-slate-500 font-medium">اختر وسيلة الدفع المناسبة لك وقم بتأكيد العملية لتفعيل اشتراكك.</p>
                </div>

                @if (paymentSubmitted()) {
                  <div class="text-center py-10 sm:py-16 bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-green-500/30 shadow-2xl shadow-green-500/10 animate-[scaleUp_0.4s_ease-out]">
                    <div class="w-16 h-16 sm:w-24 sm:h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl shadow-green-500/30">
                      <mat-icon style="font-size: 32px; width: 32px; height: 32px;" class="sm:!text-[48px] sm:!w-[48px] sm:!h-[48px]">check</mat-icon>
                    </div>
                    <h3 class="text-2xl sm:text-3xl font-black mb-3 sm:mb-4">{{ t().paymentSuccess || 'تم استلام طلبك!' }}</h3>
                    <p class="text-sm sm:text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 sm:mb-10 leading-relaxed px-6">
                      {{ t().paymentPending || 'شكراً لك! سيقوم فريقنا بمراجعة العملية وتفعيل حسابك خلال أقل من 24 ساعة.' }}
                    </p>
                    <button (click)="uiService.closeUpgradeModal()" class="px-10 py-3.5 sm:px-12 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-105 transition-all shadow-xl">
                      {{ t().close || 'العودة للرئيسية' }}
                    </button>
                  </div>
                } @else {
                  <div class="space-y-8 sm:space-y-10">
                    <!-- Step 1: Payment Method -->
                    <section>
                      <div class="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
                        <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs sm:text-sm font-black">1</span>
                        <h3 class="text-lg sm:text-xl font-black">{{ t().paymentMethod || 'وسيلة الدفع' }}</h3>
                      </div>
                      
                      <div class="grid grid-cols-2 gap-2 sm:gap-4">
                        @for (method of paymentMethods(); track method.id) {
                          <label class="group relative flex flex-col p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 cursor-pointer transition-all duration-300"
                                 [class.border-blue-600]="selectedMethod() === method.id"
                                 [class.bg-blue-50/30]="selectedMethod() === method.id && theme() === 'light'"
                                 [class.bg-blue-900/10]="selectedMethod() === method.id && theme() === 'dark'"
                                 [class.border-slate-200]="selectedMethod() !== method.id && theme() === 'light'"
                                 [class.border-slate-800]="selectedMethod() !== method.id && theme() === 'dark'"
                                 [class.hover:border-blue-400]="selectedMethod() !== method.id">
                            <input type="radio" name="paymentMethod" [value]="method.id" [(ngModel)]="selectedMethod" class="hidden">
                            
                            <div class="flex items-center justify-between mb-3 sm:mb-4">
                              <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                @if (method.iconUrl) {
                                  <img [src]="method.iconUrl" alt="" class="w-full h-full object-contain p-1.5 sm:p-2" referrerpolicy="no-referrer">
                                } @else {
                                  <mat-icon class="text-slate-400" style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">account_balance_wallet</mat-icon>
                                }
                              </div>
                              <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                                   [class.border-blue-600]="selectedMethod() === method.id"
                                   [class.bg-blue-600]="selectedMethod() === method.id"
                                   [class.border-slate-300]="selectedMethod() !== method.id">
                                @if (selectedMethod() === method.id) {
                                  <mat-icon class="text-white text-[10px] sm:text-[14px] w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center">check</mat-icon>
                                }
                              </div>
                            </div>
                            
                            <span class="font-black text-xs sm:text-lg mb-1 sm:mb-2">{{ method.name }}</span>
                            <div class="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed line-clamp-2">{{ method.details }}</div>
                          </label>
                        }
                      </div>

                      <!-- Selected Method Details (QR/Instructions) -->
                      @if (selectedMethod()) {
                        @let method = getSelectedMethodData();
                        <div class="mt-4 sm:mt-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 animate-[slideUp_0.3s_ease-out]">
                          <div class="flex items-center gap-2 mb-3 sm:mb-4">
                            <mat-icon class="text-blue-600" style="font-size: 18px; width: 18px; height: 18px;" class="sm:!text-[20px] sm:!w-[20px] sm:!h-[20px]">info</mat-icon>
                            <span class="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-400">تعليمات الدفع:</span>
                          </div>
                          
                          <div class="text-sm sm:text-lg font-black leading-relaxed whitespace-pre-wrap mb-4 sm:mb-6 text-center bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 break-all">
                            {{ method?.details || method?.walletAddress || method?.instructions }}
                          </div>
                          
                          @if (method?.qrCodeUrl || method?.qrCode || method?.walletAddress || method?.details) {
                            @let qrData = method?.qrCodeUrl || method?.qrCode || ('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + (method?.walletAddress || method?.details));
                            <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-md border border-blue-100 dark:border-blue-900/30">
                              <div class="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-inner border border-slate-100">
                                <img [src]="qrData" alt="QR Code" class="w-32 h-32 sm:w-40 sm:h-40 object-contain" referrerpolicy="no-referrer">
                              </div>
                              <div class="flex-1 text-center sm:text-right">
                                <h4 class="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">امسح الكود للدفع</h4>
                                <p class="text-[10px] sm:text-sm text-slate-500 font-bold leading-relaxed">استخدم تطبيق المحفظة الخاص بك لمسح الرمز وتحويل المبلغ المحدد بدقة لضمان سرعة التفعيل.</p>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </section>

                    <!-- Step 2: Confirmation Info -->
                    <section>
                      <div class="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
                        <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs sm:text-sm font-black">2</span>
                        <h3 class="text-lg sm:text-xl font-black">{{ t().confirmPayment || 'تأكيد العملية' }}</h3>
                      </div>

                      <div class="space-y-6">
                        <div class="group">
                          <label class="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                            {{ t().transactionId || 'رقم العملية / اسم المرسل' }}
                          </label>
                          <div class="relative">
                            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">receipt_long</mat-icon>
                            <input type="text" [(ngModel)]="transactionId" 
                                   class="w-full pl-10 sm:pl-12 pr-4 sm:pr-6 py-4 sm:py-5 rounded-xl sm:rounded-2xl border-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all text-base sm:text-lg font-bold"
                                   [class.border-slate-200]="theme() === 'light'"
                                   [class.border-slate-800]="theme() === 'dark'"
                                   placeholder="مثال: 123456789 أو اسمك الكامل">
                          </div>
                        </div>

                        <div>
                          <label class="block text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                            {{ t().uploadReceipt || 'إرفاق إيصال الدفع' }}
                          </label>
                          <label class="relative flex flex-col items-center justify-center w-full p-6 sm:p-10 border-2 border-dashed rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all group overflow-hidden"
                                 [class.border-slate-200]="theme() === 'light' && !receiptFile()"
                                 [class.border-slate-800]="theme() === 'dark' && !receiptFile()"
                                 [class.border-blue-600]="receiptFile() !== null"
                                 [class.bg-blue-50/20]="receiptFile() !== null">
                            
                            @if (receiptFile()) {
                              <div class="text-center animate-[scaleUp_0.3s_ease-out]">
                                <div class="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl shadow-blue-500/30">
                                  <mat-icon style="font-size: 24px; width: 24px; height: 24px;" class="sm:!text-[32px] sm:!w-[32px] sm:!h-[32px]">image</mat-icon>
                                </div>
                                <div class="text-sm sm:text-lg font-black text-blue-600 dark:text-blue-400 truncate max-w-[200px]">{{ receiptFile()!.name }}</div>
                                <button (click)="$event.preventDefault(); receiptFile.set(null)" class="mt-3 text-[10px] font-black text-red-500 hover:underline">حذف الملف</button>
                              </div>
                            } @else {
                              <div class="text-center transition-transform group-hover:scale-110">
                                <div class="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                  <mat-icon style="font-size: 24px; width: 24px; height: 24px;" class="sm:!text-[32px] sm:!w-[32px] sm:!h-[32px]">add_photo_alternate</mat-icon>
                                </div>
                                <div class="text-base sm:text-lg font-black">{{ t().clickToUpload || 'اضغط لرفع الإيصال' }}</div>
                                <p class="text-[10px] text-slate-400 font-bold mt-1.5 sm:mt-2">PNG, JPG حتى 5MB • اختياري</p>
                              </div>
                            }
                            <input type="file" class="hidden" accept="image/*" (change)="onReceiptSelected($event)">
                          </label>
                        </div>
                      </div>
                    </section>

                    <button (click)="submitPayment()"
                            [disabled]="!selectedMethod() || !transactionId() || isSubmitting()"
                            class="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl bg-blue-600 text-white font-black text-lg sm:text-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3">
                      @if (isSubmitting()) {
                        <div class="w-5 h-5 sm:w-6 sm:h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري معالجة الطلب...
                      } @else {
                        <mat-icon style="font-size: 20px; width: 20px; height: 20px;" class="sm:!text-[24px] sm:!w-[24px] sm:!h-[24px]">verified_user</mat-icon>
                        {{ t().submitPayment || 'تأكيد عملية الدفع' }}
                      }
                    </button>
                    
                  </div>
                }
              </div>
            </div>

            <!-- Right Side: Order Summary (Sidebar - Desktop only) -->
            <div class="hidden lg:flex w-[400px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-12 flex-col">
              <div class="sticky top-12">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{{ t().orderSummary || 'ملخص الطلب' }}</h3>
                
                <div class="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-8 relative overflow-hidden">
                  <div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl"></div>
                  
                  <div class="flex items-center gap-4 mb-8">
                    <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <mat-icon style="font-size: 24px; width: 24px; height: 24px;">{{ selectedPlanForPayment() === 'premium' ? 'stars' : 'bolt' }}</mat-icon>
                    </div>
                    <div>
                      <div class="text-2xl font-black capitalize">{{ selectedPlanForPayment() }} Plan</div>
                      <div class="text-sm font-bold text-slate-500">{{ billingCycle() === 'monthly' ? (t().monthly || 'الدفع الشهري') : (t().yearly || 'الدفع السنوي') }}</div>
                    </div>
                  </div>

                  <div class="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div class="flex justify-between items-center text-sm font-bold">
                      <span class="text-slate-500">سعر الباقة</span>
                      <span>{{ getPrice(selectedPlanForPayment()!, 'usd') }}$</span>
                    </div>
                    <div class="flex justify-between items-center text-sm font-bold">
                      <span class="text-slate-500">الضريبة</span>
                      <span class="text-green-500">0.00$</span>
                    </div>
                    <div class="pt-4 flex justify-between items-end">
                      <div>
                        <div class="text-xs font-black text-slate-400 uppercase mb-1">الإجمالي المستحق</div>
                        <div class="text-3xl font-black">{{ getPrice(selectedPlanForPayment()!, 'usd') }}$</div>
                      </div>
                      <div class="text-right">
                        <div class="text-xs font-black text-blue-600 dark:text-blue-400 mb-1">بالليرة السورية</div>
                        <div class="text-xl font-black text-blue-600 dark:text-blue-400">{{ getPrice(selectedPlanForPayment()!, 'syp') }} ل.س</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                  <h4 class="text-sm font-black text-slate-800 dark:text-white mb-4">ماذا ستحصل في هذه الباقة؟</h4>
                  <ul class="space-y-4">
                    @let features = selectedPlanForPayment() === 'premium' ? 
                      [t().premiumFeature1, t().premiumFeature2, t().premiumFeature3, t().premiumFeature4] : 
                      [t().proFeature1, t().proFeature2, t().proFeature3, t().proFeature4];
                    
                    @for (feat of features; track feat) {
                      <li class="flex items-start gap-3">
                        <mat-icon class="text-blue-600 mt-0.5" style="font-size: 18px; width: 18px; height: 18px;">verified</mat-icon>
                        <span class="text-sm font-bold text-slate-500 leading-tight">{{ feat }}</span>
                      </li>
                    }
                  </ul>
                </div>

                <div class="mt-12 p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <div class="flex gap-3">
                    <mat-icon class="text-blue-600">help_outline</mat-icon>
                    <div>
                      <p class="text-sm font-black text-blue-900 dark:text-blue-100 mb-1">تحتاج مساعدة؟</p>
                      <p class="text-xs font-bold text-blue-700/70 dark:text-blue-300/70 leading-relaxed">فريق الدعم الفني متاح دائماً لمساعدتك في إتمام عملية الدفع.</p>
                      <button class="mt-3 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline">تواصل معنا الآن</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class UpgradeModalComponent implements OnInit {
  uiService = inject(UiService);
  authService = inject(AuthService);
  
  t = input<any>(translations.ar);
  theme = input<'light' | 'dark'>('light');
  plan = input<'pro' | 'premium' | null>(null);

  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  selectedPlanForPayment = signal<'pro' | 'premium' | null>(null);
  
  pricing = signal<any>({
    pro: { monthly: { usd: 5, syp: 75000 }, yearly: { usd: 50, syp: 750000 } },
    premium: { monthly: { usd: 10, syp: 150000 }, yearly: { usd: 100, syp: 1500000 } }
  });

  paymentMethods = signal<any[]>([]);
  selectedMethod = signal<string>('');
  transactionId = signal('');
  receiptFile = signal<File | null>(null);
  isSubmitting = signal(false);
  paymentSubmitted = signal(false);

  ngOnInit() {
    this.loadData();
    if (this.plan()) {
      this.selectedPlanForPayment.set(this.plan());
    }
  }

  async loadData() {
    try {
      const p = await this.authService.getPricing();
      if (p) this.pricing.set(p);

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
      if (this.paymentMethods().length > 0) {
        this.selectedMethod.set(this.paymentMethods()[0].id);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }

  getSelectedMethodData() {
    return this.paymentMethods().find(m => m.id === this.selectedMethod());
  }

  getPrice(planType: 'pro' | 'premium', currency: 'usd' | 'syp'): number {
    const p = this.pricing();
    if (!p || !p[planType]) return 0;
    return p[planType][this.billingCycle()][currency] || 0;
  }

  selectPlan(planType: 'pro' | 'premium') {
    this.selectedPlanForPayment.set(planType);
    this.paymentSubmitted.set(false);
  }

  onReceiptSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.receiptFile.set(file);
  }

  async submitPayment() {
    if (!this.transactionId() || !this.selectedPlanForPayment()) return;
    this.isSubmitting.set(true);
    try {
      let receiptUrl = '';
      if (this.receiptFile()) {
        const user = this.authService.user();
        if (user) {
          receiptUrl = await this.authService.uploadPaymentReceipt(user.uid, this.receiptFile()!);
        }
      }
      
      const planDetails = `${this.selectedPlanForPayment()} - ${this.billingCycle()}`;
      await this.authService.submitPaymentRequest(this.transactionId(), receiptUrl, planDetails);
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
