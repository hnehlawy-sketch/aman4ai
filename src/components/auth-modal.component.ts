import { Component, inject, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closeAuthModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-md rounded-3xl shadow-2xl p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            [class.bg-white]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <button (click)="uiService.closeAuthModal()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
             <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
           </svg>
         </button>

         <!-- Logo -->
         <div class="flex flex-col items-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-7 h-7 text-white">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h1 class="text-xl font-bold">{{ authMode() === 'login' ? t().loginTitle : t().signupTitle }}</h1>
            <p class="text-sm mt-1 opacity-60 text-center px-4">{{ t().mustLogin }}</p>
         </div>

         <!-- Error Message -->
         @if (authError()) {
           <div class="mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-800">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
               <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
             </svg>
             {{ authError() }}
           </div>
         }

         <!-- Form -->
         <div class="space-y-3">
            @if (authMode() === 'signup') {
              <div>
                <input 
                  [value]="authName()" 
                  (input)="authName.set($any($event.target).value)" 
                  type="text" 
                  class="w-full px-4 py-3 rounded-xl border focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 outline-none transition-all text-sm"
                  [class.bg-gray-50]="theme() === 'light'"
                  [class.border-gray-200]="theme() === 'light'"
                  [class.bg-slate-800]="theme() === 'dark'"
                  [class.border-slate-700]="theme() === 'dark'"
                  [placeholder]="t().name"
                >
              </div>
            }

            <div>
              <input 
                [value]="authEmail()" 
                (input)="authEmail.set($any($event.target).value)" 
                type="email" 
                class="w-full px-4 py-3 rounded-xl border focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 outline-none transition-all text-sm text-left"
                [class.bg-gray-50]="theme() === 'light'"
                [class.border-gray-200]="theme() === 'light'"
                [class.bg-slate-800]="theme() === 'dark'"
                [class.border-slate-700]="theme() === 'dark'"
                [placeholder]="t().email"
                dir="ltr"
              >
            </div>

            <div>
              <input 
                [value]="authPass()" 
                (input)="authPass.set($any($event.target).value)" 
                type="password" 
                class="w-full px-4 py-3 rounded-xl border focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 outline-none transition-all text-sm"
                [class.bg-gray-50]="theme() === 'light'"
                [class.border-gray-200]="theme() === 'light'"
                [class.bg-slate-800]="theme() === 'dark'"
                [class.border-slate-700]="theme() === 'dark'"
                [placeholder]="t().password"
              >
            </div>
         </div>

         <div class="mt-6 space-y-3">
           <button 
             (click)="handleAuth()"
             [disabled]="authLoading()"
             class="w-full py-3 rounded-xl font-bold shadow-lg shadow-slate-900/10 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
             [class.bg-slate-900]="theme() === 'light'"
             [class.text-white]="theme() === 'light'"
             [class.bg-white]="theme() === 'dark'"
             [class.text-slate-900]="theme() === 'dark'"
           >
             @if (authLoading()) {
               <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
             } @else {
               {{ authMode() === 'login' ? t().loginBtn : t().signupBtn }}
             }
           </button>

           <div class="relative flex py-1 items-center">
               <div class="flex-grow border-t" [class.border-gray-200]="theme() === 'light'" [class.border-slate-700]="theme() === 'dark'"></div>
               <span class="flex-shrink-0 mx-4 text-xs opacity-50 uppercase font-bold">OR</span>
               <div class="flex-grow border-t" [class.border-gray-200]="theme() === 'light'" [class.border-slate-700]="theme() === 'dark'"></div>
           </div>

           <!-- Google Login Button -->
           <button 
             (click)="handleGoogleAuth()"
             [disabled]="authLoading()"
             class="w-full py-3 rounded-xl font-medium border flex items-center justify-center gap-3 transition-colors disabled:opacity-70"
             [class.bg-white]="theme() === 'light'"
             [class.border-gray-200]="theme() === 'light'"
             [class.hover:bg-gray-50]="theme() === 'light'"
             [class.text-slate-700]="theme() === 'light'"
             [class.bg-slate-800]="theme() === 'dark'"
             [class.border-slate-700]="theme() === 'dark'"
             [class.hover:bg-slate-700]="theme() === 'dark'"
             [class.text-white]="theme() === 'dark'"
           >
              <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{{ t().googleBtn }}</span>
           </button>
         </div>

         <div class="mt-6 text-center text-sm opacity-60">
           @if (authMode() === 'login') {
             {{ t().noAccount }} <button (click)="toggleAuthMode()" class="text-orange-600 font-bold hover:underline">{{ t().createOne }}</button>
           } @else {
             {{ t().hasAccount }} <button (click)="toggleAuthMode()" class="text-orange-600 font-bold hover:underline">{{ t().signInHere }}</button>
           }
         </div>
       </div>
    </div>
  `
})
export class AuthModalComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);
  
  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();

  loginSuccess = output<void>();

  authMode = signal<'login' | 'signup'>('login');
  authEmail = signal('');
  authPass = signal('');
  authName = signal('');
  authLoading = signal(false);
  authError = signal('');
  authSuccess = signal('');
  
  async handleAuth() {
    if (!this.authEmail() || !this.authPass()) return;
    if (this.authMode() === 'signup' && !this.authName()) return;

    this.authLoading.set(true);
    this.authError.set('');
    this.authSuccess.set('');

    try {
      if (this.authMode() === 'login') {
        await this.authService.login(this.authEmail(), this.authPass());
      } else {
        await this.authService.signup(this.authName(), this.authEmail(), this.authPass());
        this.authSuccess.set(this.t().verifyEmail);
        this.authMode.set('login'); 
      }
      if (this.authService.user()) {
        this.uiService.closeAuthModal();
        this.loginSuccess.emit();
      }
    } catch (e: any) {
      console.error(e);
      let msg = this.t().authErr;
      if (e.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
      if (e.code === 'auth/weak-password') msg = 'Password is too weak.';
      if (e.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      this.authError.set(msg);
    } finally {
      this.authLoading.set(false);
    }
  }

  async handleGoogleAuth() {
    this.authLoading.set(true);
    this.authError.set('');
    
    try {
      await this.authService.loginWithGoogle();
      if (this.authService.user()) {
        this.uiService.closeAuthModal();
        this.loginSuccess.emit();
      }
    } catch (e) {
      this.authError.set(this.t().authErr);
    } finally {
      this.authLoading.set(false);
    }
  }

  toggleAuthMode() {
    this.authMode.update(m => m === 'login' ? 'signup' : 'login');
    this.authError.set('');
    this.authSuccess.set('');
  }
}
