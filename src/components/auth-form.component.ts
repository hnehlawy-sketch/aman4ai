import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          {{ isLogin() ? translationService.t().login : translationService.t().register }}
        </h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          {{ isLogin() ? translationService.t().loginDesc : translationService.t().registerDesc }}
        </p>
      </div>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div *ngIf="!isLogin()">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ translationService.t().name }}
          </label>
          <input type="text" [(ngModel)]="name" name="name" required
                 class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ translationService.t().email }}
          </label>
          <input type="email" [(ngModel)]="email" name="email" required
                 class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {{ translationService.t().password }}
          </label>
          <input type="password" [(ngModel)]="password" name="password" required
                 class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
        </div>

        <div *ngIf="error()" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
          {{ error() }}
        </div>

        <button type="submit" [disabled]="loading()"
                class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
          <span *ngIf="loading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {{ isLogin() ? translationService.t().login : translationService.t().register }}
        </button>
      </form>

      <div class="relative flex items-center py-2">
        <div class="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
        <span class="flex-shrink-0 mx-4 text-slate-400 text-sm">{{ translationService.t().or }}</span>
        <div class="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
      </div>

      <button type="button" (click)="loginWithGoogle()" [disabled]="loading()"
              class="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex justify-center items-center gap-3">
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {{ translationService.t().loginGoogle }}
      </button>

      <div class="text-center">
        <button type="button" (click)="toggleMode()" class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
          {{ isLogin() ? translationService.t().noAccount : translationService.t().hasAccount }}
        </button>
      </div>
    </div>
  `
})
export class AuthFormComponent {
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  
  loginSuccess = output<void>();

  isLogin = signal(true);
  loading = signal(false);
  error = signal('');

  name = '';
  email = '';
  password = '';

  toggleMode() {
    this.isLogin.update(v => !v);
    this.error.set('');
  }

  async onSubmit() {
    if (!this.email || !this.password || (!this.isLogin() && !this.name)) {
      this.error.set(this.translationService.t().fillAllFields || 'Please fill all fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      if (this.isLogin()) {
        await this.authService.login(this.email, this.password);
      } else {
        await this.authService.signup(this.name, this.email, this.password);
      }
      this.loginSuccess.emit();
    } catch (err: any) {
      console.error('Auth error:', err);
      this.error.set(err.message || 'Authentication failed');
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithGoogle() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.loginWithGoogle();
      this.loginSuccess.emit();
    } catch (err: any) {
      console.error('Google auth error:', err);
      this.error.set(err.message || 'Google authentication failed');
    } finally {
      this.loading.set(false);
    }
  }
}
