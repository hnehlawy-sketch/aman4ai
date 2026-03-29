import { Component, inject, signal, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
         [dir]="translationService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn"
           [class.bg-white]="!themeService.isDark()"
           [class.bg-slate-800]="themeService.isDark()">
        
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800 dark:text-white">{{ translationService.t().accountSettings }}</h2>
          <button (click)="close()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          
          <!-- Profile Picture -->
          <div class="flex flex-col items-center gap-4">
            <div class="relative group cursor-pointer" (click)="fileInput.click()">
              <div class="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                <img [src]="photoURL() || 'https://ui-avatars.com/api/?name=' + (displayName() || 'User') + '&background=random'" 
                     class="w-full h-full object-cover transition-transform group-hover:scale-110">
              </div>
              <div class="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 text-white">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </div>
            </div>
            <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ translationService.t().uploadPhoto }}</p>
          </div>

          <!-- Form Fields -->
          <div class="space-y-4">
            
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ translationService.t().email }}</label>
              <input type="email" [ngModel]="email()" (ngModelChange)="email.set($event)"
                     class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                     dir="ltr">
            </div>

            <!-- Mobile -->
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ translationService.t().mobile }}</label>
              <input type="tel" [ngModel]="mobile()" (ngModelChange)="mobile.set($event)"
                     class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                     dir="ltr" placeholder="+963 ...">
            </div>

          </div>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {{ errorMessage() }}
            </div>
          }

          <!-- Success Message -->
          @if (successMessage()) {
            <div class="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
              {{ successMessage() }}
            </div>
          }

        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
          <button (click)="close()" class="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium">
            {{ translationService.t().cancel }}
          </button>
          <button (click)="save()" [disabled]="isLoading()" 
                  class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
            <span>{{ translationService.t().saveProfile }}</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class AccountModalComponent implements OnInit {
  authService = inject(AuthService);
  uiService = inject(UiService);
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);

  email = signal('');
  mobile = signal('');
  displayName = signal('');
  photoURL = signal<string | null>(null);
  
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
  selectedFile: File | null = null;

  ngOnInit() {
    const user = this.authService.user();
    if (user) {
      this.email.set(user.email || '');
      this.displayName.set(user.displayName || '');
      this.photoURL.set(user.photoURL);
      
      this.authService.getUserMobile(user.uid).then(m => this.mobile.set(m));
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => this.photoURL.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async save() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const user = this.authService.user();
      if (!user) return;

      // 1. Update Photo
      if (this.selectedFile) {
        await this.authService.updateUserPhoto(this.selectedFile);
      }

      // 2. Update Email (if changed)
      if (this.email() !== user.email) {
        await this.authService.updateUserEmail(this.email());
      }

      // 3. Update Mobile
      await this.authService.updateUserMobile(this.mobile());

      this.successMessage.set(this.translationService.t().updateSuccess);
      setTimeout(() => this.close(), 1500);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        this.errorMessage.set(this.translationService.t().reauthRequired);
      } else {
        this.errorMessage.set(e.message || this.translationService.t().updateError);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  close() {
    this.uiService.closeAccountModal();
  }
}
