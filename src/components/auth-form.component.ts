import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <div class="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg mb-6">
        <button (click)="mode.set('login')" 
                class="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                [class.bg-white]="mode() === 'login'"
                [class.dark:bg-slate-600]="mode() === 'login'"
                [class.shadow-sm]="mode() === 'login'">
          {{ t().loginBtn }}
        </button>
        <button (click)="mode.set('signup')" 
                class="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                [class.bg-white]="mode() === 'signup'"
                [class.dark:bg-slate-600]="mode() === 'signup'"
                [class.shadow-sm]="mode() === 'signup'">
          {{ t().signupBtn }}
        </button>
      </div>

      @if (mode() === 'signup') {
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t().name }}</label>
          <input type="text" [(ngModel)]="name" 
                 class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
      }

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t().email }}</label>
        <input type="email" [(ngModel)]="email" 
               class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
               dir="ltr">
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ t().password }}</label>
        <input type="password" [(ngModel)]="password" 
               class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
               dir="ltr">
      </div>

      @if (error()) {
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {{ error() }}
        </div>
      }

      <button (click)="submit()" [disabled]="isLoading()"
              class="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50">
        {{ isLoading() ? t().processing : (mode() === 'login' ? t().loginBtn : t().signupBtn) }}
      </button>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-slate-700"></div></div>
        <div class="relative flex justify-center text-sm"><span class="px-2 bg-white dark:bg-slate-800 text-slate-500">أو</span></div>
      </div>

      <button (click)="loginWithGoogle()" 
              class="w-full py-3 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all font-medium">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5">
        {{ t().googleBtn }}
      </button>
    </div>
  `
})
export class AuthFormComponent {
  private authService = inject(AuthService);
  private translationService = inject(TranslationService);
  
  t = this.translationService.t;
  success = output<void>();

  mode = signal<'login' | 'signup'>('login');
  email = '';
  password = '';
  name = '';
  isLoading = signal(false);
  error = signal('');

  async submit() {
    this.isLoading.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'login') {
        await this.authService.login(this.email, this.password);
      } else {
        await this.authService.signup(this.email, this.password, this.name);
      }
      this.success.emit();
    } catch (e: any) {
      this.error.set(e.message || 'حدث خطأ ما');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      this.success.emit();
    } catch (e: any) {
      this.error.set(e.message || 'حدث خطأ ما');
    }
  }
}
