import { Component, inject, signal, OnInit, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import type { PaymentRequest, User, PaymentMethod, LogEntry } from '../models';
import { translations } from '../translations';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeAdminPanel()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl p-4 sm:p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <div class="flex items-center justify-between mb-6 shrink-0">
            <h2 class="text-lg sm:text-xl font-bold flex items-center gap-2">
               <div class="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 sm:w-6 sm:h-6">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                 </svg>
               </div>
               {{ t().adminPanel }}
            </h2>
            <button (click)="uiService.closeAdminPanel()" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
         </div>

         <!-- Tabs (Pills Style) -->
         <div class="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1 shrink-0">
             <button (click)="activeTab.set('dashboard')" 
                     [class.bg-blue-500]="activeTab() === 'dashboard'"
                     [class.text-white]="activeTab() === 'dashboard'"
                     [class.bg-gray-100]="activeTab() !== 'dashboard'"
                     [class.dark:bg-slate-800]="activeTab() !== 'dashboard'"
                     [class.text-slate-600]="activeTab() !== 'dashboard'"
                     [class.dark:text-slate-400]="activeTab() !== 'dashboard'"
                     class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
               {{ t().dashboard }}
             </button>
            <button (click)="activeTab.set('users')" 
                    [class.bg-blue-500]="activeTab() === 'users'"
                    [class.text-white]="activeTab() === 'users'"
                    [class.bg-gray-100]="activeTab() !== 'users'"
                    [class.dark:bg-slate-800]="activeTab() !== 'users'"
                    [class.text-slate-600]="activeTab() !== 'users'"
                    [class.dark:text-slate-400]="activeTab() !== 'users'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
              {{ t().users }}
            </button>
            <button (click)="activeTab.set('requests')" 
                    [class.bg-blue-500]="activeTab() === 'requests'"
                    [class.text-white]="activeTab() === 'requests'"
                    [class.bg-gray-100]="activeTab() !== 'requests'"
                    [class.dark:bg-slate-800]="activeTab() !== 'requests'"
                    [class.text-slate-600]="activeTab() !== 'requests'"
                    [class.dark:text-slate-400]="activeTab() !== 'requests'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 flex-shrink-0">
              {{ t().paymentRequests }}
              @if (stats().pendingRequests > 0) {
                <span class="bg-white text-blue-500 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm font-bold">{{ stats().pendingRequests }}</span>
              }
            </button>
            <button (click)="activeTab.set('methods')" 
                    [class.bg-blue-500]="activeTab() === 'methods'"
                    [class.text-white]="activeTab() === 'methods'"
                    [class.bg-gray-100]="activeTab() !== 'methods'"
                    [class.dark:bg-slate-800]="activeTab() !== 'methods'"
                    [class.text-slate-600]="activeTab() !== 'methods'"
                    [class.dark:text-slate-400]="activeTab() !== 'methods'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
              {{ t().paymentMethods }}
            </button>
            <button (click)="activeTab.set('logs')" 
                    [class.bg-blue-500]="activeTab() === 'logs'"
                    [class.text-white]="activeTab() === 'logs'"
                    [class.bg-gray-100]="activeTab() !== 'logs'"
                    [class.dark:bg-slate-800]="activeTab() !== 'logs'"
                    [class.text-slate-600]="activeTab() !== 'logs'"
                    [class.dark:text-slate-400]="activeTab() !== 'logs'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
              السجلات
            </button>
            <button (click)="activeTab.set('reports')" 
                    [class.bg-blue-500]="activeTab() === 'reports'"
                    [class.text-white]="activeTab() === 'reports'"
                    [class.bg-gray-100]="activeTab() !== 'reports'"
                    [class.dark:bg-slate-800]="activeTab() !== 'reports'"
                    [class.text-slate-600]="activeTab() !== 'reports'"
                    [class.dark:text-slate-400]="activeTab() !== 'reports'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
              التقارير
            </button>
            <button (click)="activeTab.set('settings')" 
                    [class.bg-blue-500]="activeTab() === 'settings'"
                    [class.text-white]="activeTab() === 'settings'"
                    [class.bg-gray-100]="activeTab() !== 'settings'"
                    [class.dark:bg-slate-800]="activeTab() !== 'settings'"
                    [class.text-slate-600]="activeTab() !== 'settings'"
                    [class.dark:text-slate-400]="activeTab() !== 'settings'"
                    class="px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0">
              الإعدادات
            </button>
         </div>

         <div class="flex-1 overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2">
            @if (isLoading()) {
               <div class="flex justify-center py-20">
                  <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
               </div>
            } @else if (error()) {
               <div class="p-6 text-center space-y-4 flex flex-col items-center justify-center h-full">
                  <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <h3 class="font-bold text-lg text-red-500">{{ t().error }}</h3>
                  <p class="text-sm opacity-70 max-w-md">{{ error() }}</p>
                  <button (click)="loadAdminData()" class="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold">{{ t().retry }}</button>
               </div>
             } @else {
               
               <!-- Dashboard Tab Content -->
               @if (activeTab() === 'dashboard') {
                 <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1">
                     <span class="text-[10px] font-bold opacity-50 uppercase tracking-wider">{{ t().totalUsers }}</span>
                     <span class="text-2xl sm:text-3xl font-bold text-blue-600">{{ stats().total }}</span>
                   </div>
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1">
                     <span class="text-[10px] font-bold opacity-50 uppercase tracking-wider">{{ t().premiumUsers }}</span>
                     <span class="text-2xl sm:text-3xl font-bold text-amber-600">{{ stats().premium }}</span>
                   </div>
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-red-500/5 border border-red-500/10 flex flex-col gap-1">
                     <span class="text-[10px] font-bold opacity-50 uppercase tracking-wider">{{ t().suspendedUsers }}</span>
                     <span class="text-2xl sm:text-3xl font-bold text-red-600">{{ stats().suspended }}</span>
                   </div>
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-green-500/5 border border-green-500/10 flex flex-col gap-1">
                     <span class="text-[10px] font-bold opacity-50 uppercase tracking-wider">{{ t().pendingRequestsCount }}</span>
                     <span class="text-2xl sm:text-3xl font-bold text-green-600">{{ stats().pendingRequests }}</span>
                   </div>
                 </div>

                 <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                   <!-- Recent Activity or Quick Actions -->
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border dark:border-slate-800">
                     <h3 class="font-bold mb-4 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-blue-500">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                       </svg>
                       {{ t().quickActions }}
                     </h3>
                     <div class="grid grid-cols-2 gap-2 sm:gap-3">
                       <button (click)="activeTab.set('users')" class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-all text-xs sm:text-sm font-bold text-center">إدارة المستخدمين</button>
                       <button (click)="activeTab.set('requests')" class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-all text-xs sm:text-sm font-bold text-center">مراجعة الطلبات</button>
                       <button (click)="activeTab.set('methods')" class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-all text-xs sm:text-sm font-bold text-center">وسائل الدفع</button>
                       <button (click)="loadAdminData()" class="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white transition-all text-xs sm:text-sm font-bold text-center">تحديث البيانات</button>
                     </div>

                     <div class="mt-4 sm:mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                       <div class="flex justify-between items-center mb-2">
                         <h4 class="text-[10px] font-bold opacity-50 uppercase tracking-wider">تشخيص النظام</h4>
                         <button (click)="authService.forceSync(); loadAdminData()" class="text-[10px] text-blue-500 hover:underline">مزامنة حسابي</button>
                       </div>
                       <div class="space-y-2 text-[10px] font-mono">
                         <div class="flex justify-between">
                           <span class="opacity-50">UID:</span>
                           <span class="truncate max-w-[150px]">{{ authService.user()?.uid }}</span>
                         </div>
                         <div class="flex justify-between">
                           <span class="opacity-50">Admin:</span>
                           <span [class.text-green-500]="authService.isAdmin()">{{ authService.isAdmin() ? 'YES' : 'NO' }}</span>
                         </div>
                         <div class="flex justify-between">
                           <span class="opacity-50">Users in DB:</span>
                           <span>{{ users().length }}</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- System Status -->
                   <div class="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border dark:border-slate-800">
                     <h3 class="font-bold mb-4 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-green-500">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       {{ t().systemStatus }}
                     </h3>
                     <div class="space-y-4">
                       <div class="flex justify-between items-center text-sm">
                         <span class="opacity-60">{{ t().database }} (Firestore)</span>
                         <span class="text-green-500 font-bold">متصل</span>
                       </div>
                       <div class="flex justify-between items-center text-sm">
                         <span class="opacity-60">{{ t().storage }} (Storage)</span>
                         <span class="text-green-500 font-bold">متصل</span>
                       </div>
                       <div class="flex justify-between items-center text-sm">
                         <span class="opacity-60">{{ t().authSystem }} (Auth)</span>
                         <span class="text-green-500 font-bold">متصل</span>
                       </div>
                       <div class="flex justify-between items-center text-sm">
                         <span class="opacity-60">{{ t().lastUpdate }}</span>
                         <span class="font-mono text-xs">{{ lastUpdate | date:'mediumTime' }}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               }

               <!-- Users Tab Content -->
               @if (activeTab() === 'users') {
                  <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row gap-3 mb-6">
                      <div class="relative flex-1">
                        <input type="text" 
                               [placeholder]="t().searchUser || 'بحث عن مستخدم بالاسم أو الإيميل...'" 
                               (input)="userSearch.set($any($event.target).value)"
                               class="w-full pl-10 pr-4 py-3 rounded-2xl border dark:border-slate-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                      <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button (click)="filterPremium.set(null)" [class.bg-blue-500]="filterPremium() === null" [class.text-white]="filterPremium() === null" class="px-4 py-2 rounded-xl border dark:border-slate-700 text-xs font-bold transition-all whitespace-nowrap flex-shrink-0">الكل</button>
                        <button (click)="filterPremium.set(true)" [class.bg-blue-500]="filterPremium() === true" [class.text-white]="filterPremium() === true" class="px-4 py-2 rounded-xl border dark:border-slate-700 text-xs font-bold transition-all whitespace-nowrap flex-shrink-0">ذهبي</button>
                        <button (click)="filterPremium.set(false)" [class.bg-blue-500]="filterPremium() === false" [class.text-white]="filterPremium() === false" class="px-4 py-2 rounded-xl border dark:border-slate-700 text-xs font-bold transition-all whitespace-nowrap flex-shrink-0">عادي</button>
                      </div>
                    </div>

                    @if (filteredUsers().length === 0) {
                      <div class="text-center py-20 bg-gray-50 dark:bg-slate-800/30 rounded-[32px] border-2 border-dashed dark:border-slate-800">
                        <div class="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </div>
                        <p class="font-bold opacity-50">{{ t().noUsers }}</p>
                        <p class="text-xs opacity-30">جرب تغيير كلمات البحث أو الفلاتر</p>
                        <div class="mt-4 p-4 max-w-xs mx-auto bg-blue-500/5 rounded-2xl border border-blue-500/10">
                          <p class="text-[10px] text-blue-500/70 leading-relaxed">
                            ملاحظة: يظهر المستخدمون هنا فقط بعد قيامهم بتسجيل الدخول لأول مرة في التطبيق.
                          </p>
                        </div>
                      </div>
                    } @else {
                      <div class="grid grid-cols-1 gap-4">
                        @for (user of filteredUsers(); track user.uid) {
                          <div class="p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:shadow-xl transition-all group">
                            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-base sm:text-lg text-slate-500 flex-shrink-0">
                                  {{ (user.displayName || 'U')[0].toUpperCase() }}
                                </div>
                                <div class="min-w-0 flex-1">
                                  <div class="flex items-center gap-2 flex-wrap">
                                    <p class="font-bold text-base sm:text-lg truncate">{{ user.displayName || 'User' }}</p>
                                    @if (user.isPremium) {
                                      <span class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider flex-shrink-0">Premium</span>
                                    }
                                    @if (user.isSuspended) {
                                      <span class="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider flex-shrink-0">Suspended</span>
                                    }
                                  </div>
                                  <p class="text-xs sm:text-sm opacity-50 font-mono truncate">{{ user.email }}</p>
                                  <p class="text-[10px] opacity-30 font-mono mt-1 truncate">UID: {{ user.uid }}</p>
                                </div>
                              </div>
                              
                              <div class="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <button (click)="toggleSuspension(user)" 
                                        [class.bg-red-500]="!user.isSuspended"
                                        [class.bg-green-500]="user.isSuspended"
                                        class="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 text-xs rounded-xl sm:rounded-2xl text-white font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 whitespace-nowrap">
                                  {{ user.isSuspended ? t().activate : t().suspend }}
                                </button>
                                  <button (click)="changeUserPlan(user.uid, 'free')" 
                                          [class.bg-gray-500]="user.plan === 'free'"
                                          [class.bg-gray-100]="user.plan !== 'free'"
                                          class="flex-1 sm:flex-none px-4 py-2 text-xs rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap">
                                    عادي
                                  </button>
                                  <button (click)="changeUserPlan(user.uid, 'pro')" 
                                          [class.bg-slate-500]="user.plan === 'pro'"
                                          [class.bg-gray-100]="user.plan !== 'pro'"
                                          class="flex-1 sm:flex-none px-4 py-2 text-xs rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap">
                                    برو
                                  </button>
                                  <button (click)="changeUserPlan(user.uid, 'premium')" 
                                          [class.bg-amber-500]="user.plan === 'premium'"
                                          [class.bg-gray-100]="user.plan !== 'premium'"
                                          class="flex-1 sm:flex-none px-4 py-2 text-xs rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap">
                                    بريميوم
                                  </button>
                              </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t dark:border-slate-800">
                              <div class="space-y-1.5">
                                <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75V18m-3-3V18m-3-3V18M3 21h18M3 10.5h18M3 6.75h18M3 3h18" />
                                  </svg>
                                  {{ t().accountingId }}
                                </label>
                                <input type="text" 
                                       [value]="user.accountingId || ''"
                                       [placeholder]="'أدخل المعرف...'"
                                       (change)="updateAccounting(user.uid, $any($event.target).value)"
                                       class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-orange-500/50 outline-none transition-all">
                              </div>
                              <div class="space-y-1.5">
                                <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                  </svg>
                                  {{ t().subscriptionEnd }}
                                </label>
                                <input type="date" 
                                       [value]="user.subscriptionEndDate || ''"
                                       (change)="updateSubscriptionDate(user.uid, $any($event.target).value)"
                                       class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-orange-500/50 outline-none transition-all">
                              </div>
                              <div class="space-y-1.5">
                                <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  حد التوكن اليومي
                                </label>
                                <input type="number" 
                                       [value]="user.customDailyLimit || ''"
                                       [placeholder]="'الافتراضي...'"
                                       (change)="updateDailyLimit(user.uid, $any($event.target).value)"
                                       class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-orange-500/50 outline-none transition-all">
                              </div>
                              <div class="space-y-1.5">
                                <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  آخر ظهور
                                </label>
                                <div class="text-xs font-mono opacity-60 px-3 py-2.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
                                  {{ (user.lastLogin | date:'short') || 'غير متاح' }}
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
               }

               <!-- Requests Tab Content -->
               @if (activeTab() === 'requests') {
                  <div class="space-y-4">
                    @if (requests().length === 0) {
                      <div class="text-center py-10 opacity-50">
                        <p>{{ t().noRequests }}</p>
                      </div>
                    } @else {
                      @for (req of requests(); track req.id) {
                        <div class="p-4 rounded-2xl border dark:border-slate-700">
                          <div class="flex justify-between items-center">
                            <div class="space-y-1">
                              <p class="text-sm font-bold">{{ req.email }}</p>
                              <p class="text-xs text-blue-500 font-mono">{{ req.transactionId }}</p>
                              <p class="text-[10px] opacity-50">{{ req.timestamp | date:'short' }}</p>
                            </div>
                            <div class="flex gap-2">
                              <button (click)="approve(req)" class="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold">{{ t().approve }}</button>
                              <button (click)="reject(req.id!)" class="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">{{ t().reject }}</button>
                            </div>
                          </div>
                        </div>
                      }
                    }
                  </div>
               }

                <!-- Methods Tab Content -->
                @if (activeTab() === 'methods') {
                   <div class="space-y-6">
                     <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                       <h4 class="font-bold text-sm mb-3">{{ t().addMethod }}</h4>
                       <div class="space-y-3">
                         <input type="text" [(ngModel)]="newMethod.name" [placeholder]="t().methodName" class="w-full px-4 py-2 rounded-xl border dark:border-slate-700 bg-transparent text-sm">
                         <textarea [(ngModel)]="newMethod.details" [placeholder]="t().methodDetails" class="w-full px-4 py-2 rounded-xl border dark:border-slate-700 bg-transparent text-sm h-20"></textarea>
                         
                         <div class="flex items-center gap-2">
                           <label class="flex-1 cursor-pointer">
                             <div class="px-4 py-2 rounded-xl border border-dashed dark:border-slate-700 bg-transparent text-sm text-center hover:bg-slate-500/10 transition-colors">
                               {{ newMethodFile ? newMethodFile.name : 'إرفاق صورة الباركود (اختياري)' }}
                             </div>
                             <input type="file" accept="image/*" class="hidden" (change)="onMethodFileSelected($event)">
                           </label>
                           @if (newMethodFile) {
                             <button (click)="newMethodFile = null" class="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                           }
                         </div>

                         <div class="flex items-center gap-2">
                           <label class="flex-1 cursor-pointer">
                             <div class="px-4 py-2 rounded-xl border border-dashed dark:border-slate-700 bg-transparent text-sm text-center hover:bg-slate-500/10 transition-colors">
                               {{ newMethodIconFile ? newMethodIconFile.name : 'إرفاق لوغو الشركة (اختياري)' }}
                             </div>
                             <input type="file" accept="image/*" class="hidden" (change)="onMethodIconSelected($event)">
                           </label>
                           @if (newMethodIconFile) {
                             <button (click)="newMethodIconFile = null" class="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                               </svg>
                             </button>
                           }
                         </div>

                         <button (click)="addMethod()" [disabled]="isAddingMethod() || !newMethod.name" class="w-full py-2 rounded-xl bg-blue-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                           @if (isAddingMethod()) {
                             <span class="animate-pulse">جاري الحفظ...</span>
                           } @else {
                             {{ t().save }}
                           }
                         </button>
                       </div>
                     </div>

                     <div class="space-y-3">
                       @for (method of methods(); track method.id) {
                         <div class="p-4 rounded-2xl border dark:border-slate-700 flex justify-between items-center">
                           <div>
                             <p class="font-bold">{{ method.name }}</p>
                             <p class="text-xs opacity-60">{{ method.details }}</p>
                             @if (method.qrCodeUrl) {
                               <img [src]="method.qrCodeUrl" alt="QR Code" class="mt-2 w-16 h-16 object-contain rounded border dark:border-slate-700 bg-white p-1" referrerpolicy="no-referrer">
                             }
                           </div>
                           <div class="flex gap-2">
                             <button (click)="deleteMethod(method.id)" class="p-2 rounded-lg bg-red-500/10 text-red-500">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                 <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                               </svg>
                             </button>
                           </div>
                         </div>
                       }
                     </div>
                   </div>
                }

                <!-- Logs Tab Content -->
                @if (activeTab() === 'logs') {
                  <div class="space-y-4">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="font-bold">آخر 100 عملية مسجلة</h3>
                      <button (click)="loadAdminData()" class="text-xs text-blue-500 hover:underline">تحديث</button>
                    </div>
                    <div class="space-y-3">
                      @for (log of logs(); track log.id) {
                        <div class="p-4 rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900/50 text-xs">
                          <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                              <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold uppercase tracking-wider text-[10px]"
                                    [class.text-blue-500]="log.type === 'chat'"
                                    [class.text-green-500]="log.type === 'image'"
                                    [class.text-purple-500]="log.type === 'auth'"
                                    [class.text-blue-500]="log.type === 'file'">
                                {{ log.type }}
                              </span>
                              <span class="font-bold truncate max-w-[150px]">{{ log.email }}</span>
                            </div>
                            <span class="opacity-40 font-mono">{{ log.timestamp?.toDate() | date:'short' }}</span>
                          </div>
                          
                          <div class="opacity-70 line-clamp-3 mb-2 font-mono bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                            @if (log.type === 'chat') {
                              <span class="font-bold mr-1">[{{ log.content.role }}]:</span>
                              {{ log.content.text }}
                            } @else if (log.type === 'image') {
                              <span class="font-bold mr-1">[Prompt]:</span>
                              {{ log.content.prompt }}
                            } @else if (log.type === 'auth') {
                              <span class="font-bold mr-1">[Action]:</span>
                              {{ log.content.action }} ({{ log.content.method }})
                            } @else if (log.type === 'file') {
                              <span class="font-bold mr-1">[File]:</span>
                              {{ log.content.name }} ({{ log.content.mimeType }})
                            } @else {
                              {{ log.content | json }}
                            }
                          </div>

                          @if (log.tokens) {
                            <div class="flex gap-3 opacity-40 text-[10px]">
                              <span>Tokens: {{ log.tokens }}</span>
                              @if (log.model) {
                                <span>Model: {{ log.model }}</span>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Reports Tab Content -->
                @if (activeTab() === 'reports') {
                  <div class="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div class="flex items-center justify-between">
                      <h3 class="font-bold text-lg">تقارير استهلاك التوكنات</h3>
                      <div class="text-[10px] opacity-50 font-mono">آخر تحديث: {{ lastUpdate | date:'shortTime' }}</div>
                    </div>

                    @if ((tokenReport() | keyvalue).length === 0) {
                      <div class="p-12 text-center border-2 border-dashed dark:border-slate-800 rounded-[32px] opacity-50">
                        <div class="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 text-slate-400">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                          </svg>
                        </div>
                        <p class="font-bold">لا توجد بيانات تقارير حالياً</p>
                        <p class="text-xs mt-1">يتم جمع البيانات من سجلات الاستخدام الأخيرة (آخر 100 عملية)</p>
                      </div>
                    } @else {
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        @for (type of (tokenReport() | keyvalue); track type.key) {
                          <div class="p-6 rounded-[32px] bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                            <div class="flex items-center gap-3 mb-4">
                              <div class="w-10 h-10 rounded-2xl flex items-center justify-center"
                                   [class.bg-blue-500/10]="type.key === 'chat'"
                                   [class.text-blue-500]="type.key === 'chat'"
                                   [class.bg-green-500/10]="type.key === 'image'"
                                   [class.text-green-500]="type.key === 'image'"
                                   [class.bg-purple-500/10]="type.key === 'token_usage'"
                                   [class.text-purple-500]="type.key === 'token_usage'">
                                <svg *ngIf="type.key === 'chat'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h9m-6.75-12h10.5A2.25 2.25 0 0 1 20.25 4.5v10.5A2.25 2.25 0 0 1 18 17.25h-6.375L7.5 21V17.25H4.5A2.25 2.25 0 0 1 2.25 15V4.5A2.25 2.25 0 0 1 4.5 2.25h3Z" />
                                </svg>
                                <svg *ngIf="type.key === 'image'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                                <svg *ngIf="type.key !== 'chat' && type.key !== 'image'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                                </svg>
                              </div>
                              <span class="text-xs font-bold uppercase tracking-wider opacity-60">{{ type.key }}</span>
                            </div>
                            <div class="flex items-baseline gap-2">
                              <span class="text-3xl font-bold">{{ type.value | number }}</span>
                              <span class="text-[10px] font-bold opacity-30 uppercase">Tokens</span>
                            </div>
                          </div>
                        }
                      </div>

                      <div class="p-6 rounded-[32px] bg-blue-500/5 border border-blue-500/10">
                        <h4 class="font-bold text-sm mb-4 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-blue-500">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          ملخص السجلات
                        </h4>
                        <div class="grid grid-cols-2 gap-6">
                          <div class="space-y-1">
                            <p class="text-[10px] font-bold opacity-40 uppercase tracking-widest">إجمالي السجلات المحملة</p>
                            <p class="text-xl font-bold">{{ logs().length }}</p>
                          </div>
                          <div class="space-y-1">
                            <p class="text-[10px] font-bold opacity-40 uppercase tracking-widest">آخر عملية</p>
                            <p class="text-sm font-bold truncate">{{ logs()[0]?.email || 'N/A' }}</p>
                            <p class="text-[10px] opacity-40">{{ logs()[0]?.timestamp?.toDate() | date:'short' }}</p>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- Settings Tab Content -->
                @if (activeTab() === 'settings') {
                  <div class="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <h3 class="font-bold text-lg">إعدادات النظام</h3>
                    
                    <div class="p-6 rounded-[32px] bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
                      <h4 class="font-bold text-sm mb-4">نماذج الذكاء الاصطناعي</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">Fast Model (العادي)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.fast" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">Core Model (الكور)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.core" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">Pro Model (البرو)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.pro" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">Image Model (الصور)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.image" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">Live Model (الصوت المباشر)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.live" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">TTS Model (تحويل النص لصوت)</label>
                          <input type="text" [(ngModel)]="editableSettings.models.tts" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                      </div>
                    </div>

                    <div class="p-6 rounded-[32px] bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
                      <h4 class="font-bold text-sm mb-4">حدود التوكنات الافتراضية</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">الخطة العادية (Free)</label>
                          <input type="number" [(ngModel)]="editableSettings.limits.free" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                        <div class="space-y-1.5">
                          <label class="text-[10px] font-bold opacity-40 uppercase tracking-widest">خطة برو (Pro)</label>
                          <input type="number" [(ngModel)]="editableSettings.limits.pro" class="w-full text-sm bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-xl border border-transparent focus:border-blue-500/50 outline-none transition-all">
                        </div>
                      </div>
                    </div>

                    <button (click)="saveSettings()" [disabled]="isSavingSettings()" class="w-full py-4 rounded-[24px] bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                      {{ isSavingSettings() ? 'جاري الحفظ...' : 'حفظ الإعدادات' }}
                    </button>
                  </div>
                }
             }
         </div>
       </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class AdminPanelComponent implements OnInit {
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input<any>(translations.ar);
  theme = input<'light' | 'dark'>('light');

  activeTab = signal<'dashboard' | 'users' | 'requests' | 'methods' | 'logs' | 'reports' | 'settings'>('dashboard');
  requests = signal<PaymentRequest[]>([]);
  users = signal<any[]>([]);
  methods = signal<PaymentMethod[]>([]);
  logs = signal<LogEntry[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  userSearch = signal('');
  filterPremium = signal<boolean | null>(null);
  lastUpdate = new Date();

  editableSettings: any = {
    models: { fast: '', core: '', pro: '', image: '', live: '', tts: '' },
    limits: { free: 60000, pro: 200000 }
  };
  isSavingSettings = signal(false);

  // Aggregated Report Data
  tokenReport = computed(() => {
    const logs = this.logs();
    const report: { [key: string]: number } = {};
    logs.forEach(log => {
      if (log.tokens) {
        report[log.type] = (report[log.type] || 0) + log.tokens;
      }
    });
    return report;
  });

  newMethod = { name: '', details: '', isActive: true, qrCodeUrl: '', iconUrl: '' };
  newMethodFile: File | null = null;
  newMethodIconFile: File | null = null;

  onMethodFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newMethodFile = file;
    }
  }

  onMethodIconSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newMethodIconFile = file;
    }
  }

  isAddingMethod = signal(false);

  async addMethod() {
    if (!this.newMethod.name) return;
    
    this.isAddingMethod.set(true);
    try {
      let qrCodeUrl = '';
      if (this.newMethodFile) {
        qrCodeUrl = await this.authService.uploadPaymentMethodQR(this.newMethodFile);
      }
      
      let iconUrl = '';
      if (this.newMethodIconFile) {
        iconUrl = await this.authService.uploadPaymentMethodIcon(this.newMethodIconFile);
      }
      
      const methodToAdd = { ...this.newMethod };
      if (qrCodeUrl) {
        methodToAdd.qrCodeUrl = qrCodeUrl;
      }
      if (iconUrl) {
        methodToAdd.iconUrl = iconUrl;
      }
      
      await this.authService.addPaymentMethod(methodToAdd);
      this.newMethod = { name: '', details: '', isActive: true, qrCodeUrl: '', iconUrl: '' };
      this.newMethodFile = null;
      this.newMethodIconFile = null;
      const methods = await this.authService.getPaymentMethods();
      this.methods.set(methods);
    } catch (e) {
      console.error('Failed to add method', e);
      this.error.set('فشل إضافة وسيلة الدفع. تأكد من الاتصال بالإنترنت.');
    } finally {
      this.isAddingMethod.set(false);
    }
  }

  stats = computed(() => {
    const all = this.users();
    return {
      total: all.length,
      premium: all.filter(u => u.isPremium).length,
      suspended: all.filter(u => u.isSuspended).length,
      pendingRequests: this.requests().length
    };
  });

  filteredUsers = computed(() => {
    const search = this.userSearch().toLowerCase();
    const premiumFilter = this.filterPremium();
    let allUsers = this.users();
    
    if (search) {
      allUsers = allUsers.filter(u => 
        (u.displayName || '').toLowerCase().includes(search) || 
        (u.email || '').toLowerCase().includes(search) ||
        (u.uid || '').toLowerCase().includes(search)
      );
    }

    if (premiumFilter !== null) {
      allUsers = allUsers.filter(u => !!u.isPremium === premiumFilter);
    }

    return allUsers;
  });

  ngOnInit() {
    this.loadAdminData();
  }

  async loadAdminData() {
    console.log('[AdminPanel] Loading data...');
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      // Load Users
      console.log('[AdminPanel] Fetching users...');
      const users = await this.authService.getAllUsers();
      console.log('[AdminPanel] Users fetched:', users.length);
      this.users.set(users);

      // Load Requests (independently)
      this.authService.getPendingPayments()
        .then(reqs => this.requests.set(reqs))
        .catch(e => {
          console.error('[AdminPanel] Requests load failed:', e);
          if (e.code === 'permission-denied') {
            this.error.set('ليس لديك صلاحية للوصول إلى بيانات الإدارة. تأكد أنك مسجل كمدير.');
          }
        });
      
      // Load Methods (independently)
      this.authService.getPaymentMethods()
        .then(meths => this.methods.set(meths))
        .catch(e => console.error('[AdminPanel] Methods load failed:', e));

      // Load Logs (independently)
      this.authService.getLogs(100)
        .then(l => this.logs.set(l))
        .catch(e => console.error('[AdminPanel] Logs load failed:', e));

      // Load System Settings
      const settings = await this.authService.loadSystemSettings();
      this.editableSettings = JSON.parse(JSON.stringify(settings));

    } catch (e: any) {
      console.error('[AdminPanel] General error:', e);
      if (e.code === 'permission-denied') {
        this.error.set('ليس لديك صلاحية للوصول إلى بيانات الإدارة. تأكد أنك مسجل كمدير.');
      } else {
        this.error.set(e.message || 'Permission denied');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async changeUserPlan(userId: string, plan: 'free' | 'pro' | 'premium') {
    try {
      await this.authService.updateUserPlan(userId, plan);
      this.users.update(users => users.map(u => u.uid === userId ? { ...u, plan, isPremium: plan !== 'free' } : u));
    } catch (e) {
      console.error('Failed to update plan', e);
    }
  }

  async toggleSuspension(user: User) {
    const newState = !user.isSuspended;
    if (!confirm(newState ? 'Suspend user?' : 'Activate user?')) return;
    try {
      await this.authService.updateUserStatus(user.uid, newState);
      this.users.update(users => users.map(u => u.uid === user.uid ? { ...u, isSuspended: newState } : u));
    } catch (e) {
      console.error('Failed to update status', e);
    }
  }

  async updateAccounting(uid: string, id: string) {
    try {
      await this.authService.updateUserAccounting(uid, id);
      this.users.update(users => users.map(u => u.uid === uid ? { ...u, accountingId: id } : u));
    } catch (e) {
      console.error('Failed to update accounting', e);
    }
  }

  async updateSubscriptionDate(uid: string, date: string) {
    try {
      await this.authService.updateUserSubscription(uid, true, date);
      this.users.update(users => users.map(u => u.uid === uid ? { ...u, subscriptionEndDate: date, isPremium: true } : u));
    } catch (e) {
      console.error('Failed to update subscription', e);
    }
  }

  async updateDailyLimit(uid: string, limit: number) {
    try {
      await this.authService.updateUserDailyLimit(uid, limit);
      this.users.update(users => users.map(u => u.uid === uid ? { ...u, customDailyLimit: limit } : u));
    } catch (e) {
      console.error('Failed to update daily limit', e);
    }
  }

  async approve(req: PaymentRequest) {
    if (!confirm('Approve this request?')) return;
    try {
      await this.authService.approvePayment(req);
      this.requests.update(prev => prev.filter(r => r.id === req.id ? false : true));
      this.users.update(users => users.map(u => u.uid === req.uid ? { ...u, isPremium: true } : u));
    } catch (e) {
      console.error('Approve failed', e);
    }
  }

  async reject(id: string) {
    if (!confirm('Reject this request?')) return;
    try {
      await this.authService.rejectPayment(id);
      this.requests.update(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Reject failed', e);
    }
  }

  async togglePremium(userId: string, isPremium: boolean) {
    try {
      await this.authService.updateUserPremiumStatus(userId, isPremium);
      this.users.update(users => users.map(u => u.uid === userId ? { ...u, isPremium } : u));
    } catch (e) {
      console.error('Failed to update premium status', e);
    }
  }

  async deleteMethod(id: string) {
    if (!confirm('Delete this method?')) return;
    try {
      await this.authService.deletePaymentMethod(id);
      this.methods.update(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Failed to delete method', e);
    }
  }

  async saveSettings() {
    this.isSavingSettings.set(true);
    try {
      await this.authService.updateSystemSettings(this.editableSettings);
      alert('تم حفظ الإعدادات بنجاح');
    } catch (e) {
      console.error('Failed to save settings', e);
      alert('فشل حفظ الإعدادات');
    } finally {
      this.isSavingSettings.set(false);
    }
  }
}
