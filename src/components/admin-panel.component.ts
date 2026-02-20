import { Component, inject, signal, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { PaymentRequest } from '../models';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeAdminPanel()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col h-[85vh]"
            [class.bg-white]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <!-- Header & Tabs -->
         <div class="p-6 border-b dark:border-slate-800">
            <div class="flex items-center justify-between mb-6">
               <h2 class="text-xl font-bold flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-orange-500">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  {{ t().adminPanel }}
               </h2>
               <button (click)="uiService.closeAdminPanel()" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>

            <div class="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 w-fit">
               <button (click)="activeTab.set('payments')" 
                       class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                       [class.bg-white]="activeTab() === 'payments' && theme() === 'light'"
                       [class.bg-slate-700]="activeTab() === 'payments' && theme() === 'dark'"
                       [class.text-orange-500]="activeTab() === 'payments'"
                       [class.opacity-50]="activeTab() !== 'payments'">
                  {{ t().payments }}
               </button>
               <button (click)="activeTab.set('users')" 
                       class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                       [class.bg-white]="activeTab() === 'users' && theme() === 'light'"
                       [class.bg-slate-700]="activeTab() === 'users' && theme() === 'dark'"
                       [class.text-orange-500]="activeTab() === 'users'"
                       [class.opacity-50]="activeTab() !== 'users'">
                  {{ t().users }}
               </button>
               <button (click)="activeTab.set('system')" 
                       class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                       [class.bg-white]="activeTab() === 'system' && theme() === 'light'"
                       [class.bg-slate-700]="activeTab() === 'system' && theme() === 'dark'"
                       [class.text-orange-500]="activeTab() === 'system'"
                       [class.opacity-50]="activeTab() !== 'system'">
                  {{ t().system }}
               </button>
            </div>
         </div>

         <div class="flex-1 overflow-y-auto p-6">
            @if (isLoading()) {
               <div class="flex justify-center py-20">
                  <svg class="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
               </div>
            } @else {
               <!-- Payments Tab -->
               @if (activeTab() === 'payments') {
                  <div class="space-y-4">
                     @if (requests().length === 0) {
                        <div class="text-center py-10 opacity-50">
                           <p>{{ t().noRequests }}</p>
                        </div>
                     } @else {
                        @for (req of requests(); track req.id) {
                           <div class="p-4 rounded-2xl border transition-all"
                                [class.bg-gray-50]="theme() === 'light'"
                                [class.border-gray-100]="theme() === 'light'"
                                [class.bg-slate-800/50]="theme() === 'dark'"
                                [class.border-slate-700]="theme() === 'dark'">
                              
                              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 <div class="space-y-1">
                                    <div class="flex items-center gap-2">
                                       <span class="text-xs font-bold opacity-50 uppercase tracking-wider">{{ t().userEmail }}:</span>
                                       <span class="text-sm font-medium">{{ req.email }}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                       <span class="text-xs font-bold opacity-50 uppercase tracking-wider">{{ t().transactionId }}:</span>
                                       <span class="text-sm font-bold text-orange-600">{{ req.transactionId }}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                       <span class="text-xs font-bold opacity-50 uppercase tracking-wider">{{ t().requestDate }}:</span>
                                       <span class="text-[10px] opacity-60">{{ req.timestamp | date:'short' }}</span>
                                    </div>
                                 </div>

                                 <div class="flex items-center gap-2">
                                    <button (click)="approve(req)" 
                                            class="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold shadow-lg shadow-green-500/20 hover:bg-green-600 active:scale-95 transition-all">
                                       {{ t().approve }}
                                    </button>
                                    <button (click)="reject(req.id!)" 
                                            class="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all">
                                       {{ t().reject }}
                                    </button>
                                 </div>
                              </div>
                           </div>
                        }
                     }
                  </div>
               }

               <!-- Users Tab -->
               @if (activeTab() === 'users') {
                  <div class="space-y-6">
                     <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div class="flex gap-4">
                           <div class="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                              <p class="text-[10px] font-bold uppercase opacity-50 mb-1">{{ t().totalUsers }}</p>
                              <p class="text-2xl font-bold text-orange-600">{{ users().length }}</p>
                           </div>
                           <div class="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                              <p class="text-[10px] font-bold uppercase opacity-50 mb-1">{{ t().premiumUsers }}</p>
                              <p class="text-2xl font-bold text-green-600">{{ premiumCount() }}</p>
                           </div>
                        </div>
                        <input [(ngModel)]="searchQuery" 
                               type="text" 
                               [placeholder]="t().searchUser"
                               class="px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-orange-500/20 w-full sm:w-64 text-sm"
                               [class.bg-white]="theme() === 'light'"
                               [class.bg-slate-800]="theme() === 'dark'"
                               [class.border-gray-200]="theme() === 'light'"
                               [class.border-slate-700]="theme() === 'dark'">
                     </div>

                     <div class="space-y-3">
                        @for (user of filteredUsers(); track user.uid) {
                           <div class="p-4 rounded-2xl border flex items-center justify-between"
                                [class.bg-gray-50]="theme() === 'light'"
                                [class.border-gray-100]="theme() === 'light'"
                                [class.bg-slate-800/30]="theme() === 'dark'"
                                [class.border-slate-700]="theme() === 'dark'">
                              <div class="flex items-center gap-3">
                                 <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 font-bold">
                                    {{ user.displayName?.charAt(0) || 'U' }}
                                 </div>
                                 <div>
                                    <p class="text-sm font-bold">{{ user.displayName }}</p>
                                    <p class="text-[10px] opacity-50">{{ user.email }}</p>
                                 </div>
                              </div>
                              <div class="flex items-center gap-2">
                                 <button (click)="togglePremium(user)" 
                                         class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                         [class.bg-orange-500]="user.isPremium"
                                         [class.text-white]="user.isPremium"
                                         [class.bg-gray-200]="!user.isPremium"
                                         [class.dark:bg-slate-700]="!user.isPremium">
                                    {{ user.isPremium ? t().removePremium : t().makePremium }}
                                 </button>
                                 <button (click)="toggleAdmin(user)" 
                                         class="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                         [class.bg-red-500]="user.isAdmin"
                                         [class.text-white]="user.isAdmin"
                                         [class.bg-gray-200]="!user.isAdmin"
                                         [class.dark:bg-slate-700]="!user.isAdmin">
                                    {{ user.isAdmin ? t().removeAdmin : t().makeAdmin }}
                                 </button>
                              </div>
                           </div>
                        }
                     </div>
                  </div>
               }

               <!-- System Tab -->
               @if (activeTab() === 'system') {
                  <div class="max-w-md mx-auto space-y-8 py-10">
                     <div class="text-center space-y-4">
                        <h3 class="text-lg font-bold">{{ t().updateQr }}</h3>
                        
                        <div class="relative group mx-auto w-48 h-48">
                           <div class="w-full h-full rounded-3xl border-2 border-dashed border-orange-500/30 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-800">
                              @if (qrPreview() || systemSettings().qrCodeUrl) {
                                 <img [src]="qrPreview() || systemSettings().qrCodeUrl" class="w-full h-full object-contain p-4">
                              } @else {
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 opacity-20">
                                   <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                 </svg>
                              }
                           </div>
                           <label class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                              <span class="text-white text-xs font-bold">{{ t().uploadNewQr }}</span>
                              <input type="file" (change)="onQrFileSelected($event)" class="hidden" accept="image/*">
                           </label>
                        </div>

                        @if (selectedQrFile) {
                           <button (click)="uploadNewQr()" 
                                   [disabled]="isUploadingQr()"
                                   class="w-full py-3 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50">
                              {{ isUploadingQr() ? '...' : t().updateQr }}
                           </button>
                        }
                     </div>
                  </div>
               }
            }
         </div>
       </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();

  activeTab = signal<'payments' | 'users' | 'system'>('payments');
  isLoading = signal(true);
  
  // Payments
  requests = signal<PaymentRequest[]>([]);
  
  // Users
  users = signal<any[]>([]);
  searchQuery = '';
  premiumCount = signal(0);
  
  // System
  systemSettings = signal<any>({});
  selectedQrFile: File | null = null;
  qrPreview = signal<string | null>(null);
  isUploadingQr = signal(false);

  ngOnInit() {
    this.loadAllData();
  }

  async loadAllData() {
    this.isLoading.set(true);
    try {
      const [payments, allUsers, settings] = await Promise.all([
        this.authService.getPendingPayments(),
        this.authService.getAllUsers(),
        this.authService.getSystemSettings()
      ]);
      
      this.requests.set(payments);
      this.users.set(allUsers);
      this.systemSettings.set(settings);
      this.premiumCount.set(allUsers.filter(u => u.isPremium).length);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredUsers() {
    if (!this.searchQuery) return this.users();
    const q = this.searchQuery.toLowerCase();
    return this.users().filter(u => 
      u.email?.toLowerCase().includes(q) || 
      u.displayName?.toLowerCase().includes(q)
    );
  }

  async approve(req: PaymentRequest) {
    if (!confirm('Approve this payment?')) return;
    try {
      await this.authService.approvePayment(req);
      this.requests.update(prev => prev.filter(r => r.id !== req.id));
      // Update user in local list too
      this.users.update(prev => prev.map(u => u.uid === req.uid ? { ...u, isPremium: true } : u));
      this.premiumCount.update(c => c + 1);
    } catch (e) {
      console.error('Approve failed', e);
    }
  }

  async reject(id: string) {
    if (!confirm('Reject this payment?')) return;
    try {
      await this.authService.rejectPayment(id);
      this.requests.update(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Reject failed', e);
    }
  }

  async togglePremium(user: any) {
    const newStatus = !user.isPremium;
    try {
      await this.authService.updateUserStatus(user.uid, { isPremium: newStatus });
      this.users.update(prev => prev.map(u => u.uid === user.uid ? { ...u, isPremium: newStatus } : u));
      this.premiumCount.update(c => newStatus ? c + 1 : c - 1);
    } catch (e) {
      console.error('Toggle premium failed', e);
    }
  }

  async toggleAdmin(user: any) {
    const newStatus = !user.isAdmin;
    if (!confirm(`Change admin status for ${user.displayName}?`)) return;
    try {
      await this.authService.updateUserStatus(user.uid, { isAdmin: newStatus });
      this.users.update(prev => prev.map(u => u.uid === user.uid ? { ...u, isAdmin: newStatus } : u));
    } catch (e) {
      console.error('Toggle admin failed', e);
    }
  }

  onQrFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedQrFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.qrPreview.set(e.target.result);
      reader.readAsDataURL(file);
    }
  }

  async uploadNewQr() {
    if (!this.selectedQrFile) return;
    this.isUploadingQr.set(true);
    try {
      const url = await this.authService.uploadQrCode(this.selectedQrFile);
      await this.authService.updateQrCode(url);
      this.systemSettings.update(s => ({ ...s, qrCodeUrl: url }));
      this.qrPreview.set(null);
      this.selectedQrFile = null;
      alert(this.t().qrUpdated);
    } catch (e) {
      console.error('QR upload failed', e);
    } finally {
      this.isUploadingQr.set(false);
    }
  }
}
