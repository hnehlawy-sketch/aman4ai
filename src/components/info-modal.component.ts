import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
            [class.bg-white]="theme() === 'light'"
            [class.text-slate-800]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.text-white]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
          
          <div class="flex items-center justify-between mb-4 sm:mb-6">
             <h2 class="text-lg sm:text-xl font-bold">
                {{ type() === 'privacy' ? (t().infoPrivacyTitle || 'سياسة الخصوصية') : (type() === 'terms' ? (t().infoTermsTitle || 'شروط الخدمة') : (t().infoAboutTitle || 'أمان AI')) }}
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
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoPrivacy1Title || '1. جمع البيانات' }}</h3>
                      <p>{{ t().infoPrivacy1Desc || 'نحن نجمع فقط المعلومات الضرورية لتشغيل الخدمة، مثل بريدك الإلكتروني واسمك لتخصيص التجربة.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoPrivacy2Title || '2. استخدام البيانات' }}</h3>
                      <p>{{ t().infoPrivacy2Desc || 'تُستخدم بياناتك لتحسين جودة الردود وحفظ سجل المحادثات الخاص بك. نحن لا نبيع بياناتك لأي طرف ثالث.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoPrivacy3Title || '3. أمان البيانات' }}</h3>
                      <p>{{ t().infoPrivacy3Desc || 'نستخدم تقنيات تشفير متقدمة لحماية بياناتك. يتم تخزين المحادثات بشكل آمن عبر خدمات Firebase.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoPrivacy4Title || '4. حقوقك' }}</h3>
                      <p>{{ t().infoPrivacy4Desc || 'يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر التواصل مع الدعم الفني.' }}</p>
                   </section>
                </div>
             } @else if (type() === 'terms') {
                <div class="space-y-4">
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoTerms1Title || '1. قبول الشروط' }}</h3>
                      <p>{{ t().infoTerms1Desc || 'باستخدامك لتطبيق أمان AI، فإنك توافق على الالتزام بشروط الخدمة هذه.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoTerms2Title || '2. الاستخدام العادل' }}</h3>
                      <p>{{ t().infoTerms2Desc || 'يُحظر استخدام التطبيق في أي أعمال غير قانونية أو لإنشاء محتوى مسيء أو ضار.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoTerms3Title || '3. حدود المسؤولية' }}</h3>
                      <p>{{ t().infoTerms3Desc || 'أمان AI هو نموذج ذكاء اصطناعي قد يخطئ أحياناً. المستخدم مسؤول عن التحقق من دقة المعلومات المقدمة.' }}</p>
                   </section>
                   <section>
                      <h3 class="font-bold text-blue-500 mb-2">{{ t().infoTerms4Title || '4. الاشتراكات' }}</h3>
                      <p>{{ t().infoTerms4Desc || 'الاشتراكات الذهبية تمنح ميزات إضافية وهي غير قابلة للاسترداد بعد التفعيل.' }}</p>
                   </section>
                </div>
             } @else if (type() === 'about') {
                <div class="space-y-4 text-center py-6">
                   <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-4 sm:mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 sm:w-10 sm:h-10 text-white">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                   </div>
                   <h3 class="text-xl sm:text-2xl font-bold">{{ t().infoAboutTitle || 'أمان AI' }}</h3>
                   <p class="text-base sm:text-lg opacity-70 italic">{{ t().infoAboutSubtitle || 'مساعدك الذكي، من دمشق إلى العالم.' }}</p>
                   <p class="max-w-md mx-auto leading-relaxed text-sm">
                      {{ t().infoAboutDesc || 'أمان هو مشروع طموح يهدف لتقديم أفضل تجربة ذكاء اصطناعي باللغة العربية، مع التركيز على الخصوصية والسرعة والدقة في الردود.' }}
                   </p>
                   <div class="pt-6 border-t dark:border-slate-800">
                      <p class="text-xs opacity-50">{{ t().infoAboutDev || 'تطوير: فريق أمان AI' }}</p>
                      <p class="text-xs opacity-50">{{ t().infoAboutVer || 'الإصدار: 1.0.0 (Aman Core)' }}</p>
                      <p class="text-xs opacity-50 mt-2 font-mono">Powered by Google</p>
                   </div>
                </div>
             }
          </div>

          <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t dark:border-slate-800 flex justify-center">
             <button (click)="close.emit()" class="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                {{ t().infoOk || 'حسناً' }}
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
  type = input<'privacy' | 'terms' | 'about'>('privacy');
  title = input<string>('');
  theme = input<'light' | 'dark'>('light');
  t = input<any>({});
  close = output<void>();
}
