import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="authForm" (ngSubmit)="onSubmit()" class="space-y-4">
      @if (mode() === 'signup') {
        <div>
          <label class="block text-sm font-medium mb-1">{{ t().name }}</label>
          <input type="text" formControlName="name" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
        </div>
      }
      
      <div>
        <label class="block text-sm font-medium mb-1">{{ t().email }}</label>
        <input type="email" formControlName="email" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">{{ t().password }}</label>
        <input type="password" formControlName="password" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
      </div>

      <button type="submit" [disabled]="authForm.invalid || loading()" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {{ loading() ? t().processing : (mode() === 'login' ? t().loginBtn : t().signupBtn) }}
      </button>
    </form>
  `
})
export class AuthFormComponent {
  fb = inject(FormBuilder);
  translationService = inject(TranslationService);
  t = this.translationService.t;

  mode = input.required<'login' | 'signup'>();
  loading = input.required<boolean>();
  submit = output<any>();

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    name: ['']
  });

  onSubmit() {
    if (this.authForm.valid) {
      this.submit.emit(this.authForm.value);
    }
  }
}
