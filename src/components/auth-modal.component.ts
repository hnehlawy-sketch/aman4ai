import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { ThemeService } from '../services/theme.service';
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

         <app-auth-form (loginSuccess)="onLoginSuccess()"></app-auth-form>
       </div>
    </div>
  `
})
export class AuthModalComponent {
  uiService = inject(UiService);
  themeService = inject(ThemeService);
  
  loginSuccess = output<void>();

  onLoginSuccess() {
    this.uiService.closeAuthModal();
    this.loginSuccess.emit();
  }
}
