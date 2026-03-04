import { Component, inject, input, output, WritableSignal, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { UserProfile } from '../models';
import { translations } from '../translations';

@Component({
  selector: 'app-personalization-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <!-- Backdrop -->
       <div (click)="uiService.closePersonalizationModal()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       
       <!-- Modal Content -->
       <div class="w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
            [class.bg-white]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <!-- Header -->
         <div class="flex items-start justify-between mb-6">
            <div class="flex flex-col">
              <h2 class="text-xl font-bold">{{ t().personalization }}</h2>
              <p class="text-sm opacity-60 mt-1">{{ t().personalizationSub }}</p>
            </div>
            <button (click)="uiService.closePersonalizationModal()" class="p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
               <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
             </svg>
           </button>
         </div>

         <!-- Form -->
         <div class="space-y-4">
           <!-- Name & DOB -->
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().name }}</label>
                <input [value]="profileFormSignal()().name" (input)="updateProfileName($any($event.target).value)" type="text" [placeholder]="t().name" class="w-full px-3 py-2.5 rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              </div>
              <div>
                <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().dob }}</label>
                <input [value]="profileFormSignal()().dob" (input)="updateProfileDob($any($event.target).value)" type="date" class="w-full px-3 py-2.5 rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              </div>
           </div>
           
           <!-- Education & Marital Status -->
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().education }}</label>
                <select [value]="profileFormSignal()().education" (change)="updateProfileEducation($any($event.target).value)" class="w-full px-3 py-2.5 rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <option value="unspecified">{{t().eduUnspecified}}</option>
                  <option value="highschool">{{t().eduHighschool}}</option>
                  <option value="diploma">{{t().eduDiploma}}</option>
                  <option value="university">{{t().eduUniversity}}</option>
                  <option value="masters">{{t().eduMasters}}</option>
                  <option value="phd">{{t().eduPhd}}</option>
                </select>
             </div>
             <div>
                <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().maritalStatus }}</label>
                <select [value]="profileFormSignal()().maritalStatus" (change)="updateProfileMaritalStatus($any($event.target).value)" class="w-full px-3 py-2.5 rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <option value="unspecified">{{t().msUnspecified}}</option>
                  <option value="single">{{t().msSingle}}</option>
                  <option value="married">{{t().msMarried}}</option>
                  <option value="divorced">{{t().msDivorced}}</option>
                  <option value="widowed">{{t().msWidowed}}</option>
                </select>
             </div>
           </div>

           <!-- Instructions -->
           <div>
              <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().instructions }}</label>
              <textarea [value]="profileFormSignal()().instructions" (input)="updateProfileInstructions($any($event.target).value)" rows="5" [placeholder]="t().instructionsPlaceholder" class="w-full px-3 py-2.5 rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all text-sm bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 resize-y"></textarea>
           </div>

           <!-- Voice Selection -->
           <div>
              <label class="text-xs font-bold opacity-70 mb-1 block">{{ t().voicePreference || 'تفضيل الصوت (للمحادثة المباشرة)' }}</label>
              <div class="grid grid-cols-2 gap-3">
                <button (click)="updateProfileVoice('Puck')" 
                        class="p-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                        [class.border-blue-500]="profileFormSignal()().voiceName === 'Puck'"
                        [class.bg-blue-50]="profileFormSignal()().voiceName === 'Puck' && theme() === 'light'"
                        [class.bg-blue-900/20]="profileFormSignal()().voiceName === 'Puck' && theme() === 'dark'"
                        [class.border-gray-200]="profileFormSignal()().voiceName !== 'Puck' && theme() === 'light'"
                        [class.border-slate-700]="profileFormSignal()().voiceName !== 'Puck' && theme() === 'dark'">
                  <span class="text-2xl">👨</span>
                  <span class="font-medium text-sm">{{ t().voiceMale || 'صوت شاب' }}</span>
                </button>
                
                <button (click)="updateProfileVoice('Kore')" 
                        class="p-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                        [class.border-blue-500]="profileFormSignal()().voiceName === 'Kore'"
                        [class.bg-blue-50]="profileFormSignal()().voiceName === 'Kore' && theme() === 'light'"
                        [class.bg-blue-900/20]="profileFormSignal()().voiceName === 'Kore' && theme() === 'dark'"
                        [class.border-gray-200]="profileFormSignal()().voiceName !== 'Kore' && theme() === 'light'"
                        [class.border-slate-700]="profileFormSignal()().voiceName !== 'Kore' && theme() === 'dark'">
                  <span class="text-2xl">👩</span>
                  <span class="font-medium text-sm">{{ t().voiceFemale || 'صوت فتاة' }}</span>
                </button>
              </div>
           </div>
         </div>
         
         <!-- Actions -->
         <div class="mt-6 sm:mt-8 flex justify-end">
           <button (click)="saveProfile()" class="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 active:scale-95 transition-transform"
             [class.bg-slate-900]="theme() === 'light'"
             [class.text-white]="theme() === 'light'"
             [class.bg-white]="theme() === 'dark'"
             [class.text-slate-900]="theme() === 'dark'"
           >
             {{ t().saveProfile }}
           </button>
         </div>
       </div>
    </div>
  `
})
export class PersonalizationModalComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);
  
  t = input<any>(translations.ar);
  theme = input<'light' | 'dark'>('light');
  profileFormSignal = input<WritableSignal<UserProfile>>(signal({ name: '', dob: '', education: 'unspecified', maritalStatus: 'unspecified', instructions: '' }) as any);
  @Output() profileSaved = new EventEmitter<void>();

  updateProfileName(name: string) {
    this.profileFormSignal().update(p => ({ ...p, name }));
  }

  updateProfileDob(dob: string) {
    this.profileFormSignal().update(p => ({ ...p, dob }));
  }

  updateProfileEducation(education: string) {
    this.profileFormSignal().update(p => ({ ...p, education: education as UserProfile['education'] }));
  }

  updateProfileMaritalStatus(maritalStatus: string) {
    this.profileFormSignal().update(p => ({ ...p, maritalStatus: maritalStatus as UserProfile['maritalStatus'] }));
  }

  updateProfileInstructions(instructions: string) {
    this.profileFormSignal().update(p => ({ ...p, instructions }));
  }

  updateProfileVoice(voiceName: 'Puck' | 'Kore') {
    this.profileFormSignal().update(p => ({ ...p, voiceName }));
  }

  async saveProfile() {
    const user = this.authService.user();
    if (!user) return;

    const profileData = this.profileFormSignal()();
    await this.authService.saveUserProfile(user.uid, profileData);
    
    // Parent component will update the main userProfile signal via an effect
    // But we can also set it directly for immediate feedback if we pass it in.
    localStorage.setItem(`aman_profile_${user.uid}`, JSON.stringify(profileData));
    
    this.profileSaved.emit();
    this.uiService.closePersonalizationModal();
  }
}
