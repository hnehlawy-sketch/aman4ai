import { Component, output, inject, signal, computed } from '@angular/core';
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
      <h2 class="text-2xl font-bold text-center dark:text-white">{{ t().loginTitle }}</h2>
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1 dark:text-slate-300">{{ t().email }}</label>
          <input type="email" [(ngModel)]="email" name="email" class="w-full p-2 rounded border bg-transparent dark:border-slate-700 dark:text-white" required>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 dark:text-slate-300">{{ t().password }}</label>
          <input type="password" [(ngModel)]="password" name="password" class="w-full p-2 rounded border bg-transparent dark:border-slate-700 dark:text-white" required>
        </div>
        <button type="submit" class="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors">
          {{ t().loginBtn }}
        </button>
      </form>
      <div class="relative">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-300 dark:border-slate-700"></div></div>
        <div class="relative flex justify-center text-sm"><span class="px-2 bg-white dark:bg-slate-900 text-gray-500">أو</span></div>
      </div>
      <button (click)="loginWithGoogle()" class="w-full flex items-center justify-center gap-2 border dark:border-slate-700 p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 transition-colors dark:text-white">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5">
        {{ t().googleBtn }}
      </button>
    </div>
  `
})
export class AuthFormComponent {
  authService = inject(AuthService);
  translationService = inject(TranslationService);
  t = computed(() => this.translationService.t());
  
  email = '';
  password = '';
  
  loginSuccess = output<void>();

  async onSubmit() {
    try {
      await this.authService.login(this.email, this.password);
      this.loginSuccess.emit();
    } catch (e) {
      console.error(e);
    }
  }

  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
      this.loginSuccess.emit();
    } catch (e) {
      console.error(e);
    }
  }
}
