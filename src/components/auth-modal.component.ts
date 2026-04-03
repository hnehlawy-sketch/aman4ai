import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';
import { AuthFormComponent } from './auth-form.component';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, AuthFormComponent],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeAuthModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            [class.bg-white]="!themeService.isDark()"
            [class.bg-slate-900]="themeService.isDark()"
            [class.border]="themeService.isDark()"
            [class.border-slate-800]="themeService.isDark()">
         
         <button (click)="uiService.closeAuthModal()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
             <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
           </svg>
         </button>

         <div class="mb-6 text-center">
            <h2 class="text-2xl font-bold mb-2">{{ authMode() === 'login' ? t().loginTitle : t().signupTitle }}</h2>
            <p class="text-sm opacity-60">{{ authMode() === 'login' ? t().loginSubtitle : t().signupSubtitle }}</p>
         </div>

         @if (errorMessage()) {
           <div class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
             {{ errorMessage() }}
           </div>
         }

         <app-auth-form 
           [mode]="authMode()" 
           [loading]="isLoading()" 
           (submit)="handleAuth($event)">
         </app-auth-form>

         <div class="mt-6 text-center">
            <button (click)="toggleMode()" class="text-sm text-blue-500 hover:underline">
              {{ authMode() === 'login' ? t().noAccount : t().hasAccount }}
            </button>
         </div>

         <div class="mt-6 flex items-center gap-4">
            <div class="flex-1 h-px bg-gray-200 dark:bg-slate-800"></div>
            <span class="text-xs opacity-40">{{ t().orContinueWith }}</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-slate-800"></div>
         </div>

         <button (click)="loginWithGoogle()" [disabled]="isLoading()" class="mt-6 w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="text-sm font-medium">{{ t().googleLogin }}</span>
         </button>
       </div>
    </div>
  `
})
export class AuthModalComponent {
  uiService = inject(UiService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  
  loginSuccess = output<void>();

  authMode = signal<'login' | 'signup'>('login');
  isLoading = signal(false);
  errorMessage = signal('');
  t = this.translationService.t;

  toggleMode() {
    this.authMode.update(m => m === 'login' ? 'signup' : 'login');
    this.errorMessage.set('');
  }

  async handleAuth(data: any) {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      if (this.authMode() === 'login') {
        await this.authService.login(data.email, data.password);
      } else {
        await this.authService.signup(data.email, data.password, data.name);
      }
      this.onLoginSuccess();
    } catch (e: any) {
      this.errorMessage.set(e.message || 'Authentication failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.authService.loginWithGoogle();
      this.onLoginSuccess();
    } catch (e: any) {
      this.errorMessage.set(e.message || 'Google login failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  onLoginSuccess() {
    this.uiService.closeAuthModal();
    this.loginSuccess.emit();
  }
}
