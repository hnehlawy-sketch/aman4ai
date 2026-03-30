import { Component, input, output, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-prompt-templates',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="w-full max-w-4xl mx-auto px-0 sm:px-4 pb-4">
      <!-- Prompt Templates Row -->
      <div class="grid grid-cols-2 sm:flex sm:flex-row sm:flex-nowrap gap-3 sm:gap-4 justify-center pb-4 px-4 sm:px-0">
        
        <!-- Email Card -->
        <button (click)="usePrompt.emit(t().sugEmailPrompt)" 
          class="w-full sm:min-w-[180px] h-[110px] sm:h-[120px] flex flex-col items-start justify-between text-start p-4 rounded-2xl sm:rounded-[1.25rem] transition-all hover:-translate-y-1 hover:shadow-md group border border-transparent"
          [class.bg-white]="theme() === 'light'" [class.shadow-sm]="theme() === 'light'" [class.hover:border-blue-200]="theme() === 'light'"
          [class.bg-[#111]]="theme() === 'dark'" [class.hover:border-blue-500/30]="theme() === 'dark'">
          <div class="p-2.5 w-fit rounded-xl bg-blue-50/50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20 transition-colors">
            <mat-icon class="text-[20px] w-[20px] h-[20px] sm:text-[22px] sm:w-[22px] sm:h-[22px]">mail</mat-icon>
          </div>
          <span class="font-medium text-[13px] sm:text-sm leading-snug line-clamp-2 text-slate-700 dark:text-slate-200">{{ t().sugEmailTitle }}</span>
        </button>

        <!-- Summary Card -->
        <button (click)="usePrompt.emit(t().sugSummaryPrompt)" 
          class="w-full sm:min-w-[180px] h-[110px] sm:h-[120px] flex flex-col items-start justify-between text-start p-4 rounded-2xl sm:rounded-[1.25rem] transition-all hover:-translate-y-1 hover:shadow-md group border border-transparent"
          [class.bg-white]="theme() === 'light'" [class.shadow-sm]="theme() === 'light'" [class.hover:border-emerald-200]="theme() === 'light'"
          [class.bg-[#111]]="theme() === 'dark'" [class.hover:border-emerald-500/30]="theme() === 'dark'">
          <div class="p-2.5 w-fit rounded-xl bg-emerald-50/50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:group-hover:bg-emerald-500/20 transition-colors">
            <mat-icon class="text-[20px] w-[20px] h-[20px] sm:text-[22px] sm:w-[22px] sm:h-[22px]">auto_stories</mat-icon>
          </div>
          <span class="font-medium text-[13px] sm:text-sm leading-snug line-clamp-2 text-slate-700 dark:text-slate-200">{{ t().sugSummaryTitle }}</span>
        </button>

        <!-- Ideas Card -->
        <button (click)="usePrompt.emit(t().sugIdeasPrompt)" 
          class="w-full sm:min-w-[180px] h-[110px] sm:h-[120px] flex flex-col items-start justify-between text-start p-4 rounded-2xl sm:rounded-[1.25rem] transition-all hover:-translate-y-1 hover:shadow-md group border border-transparent"
          [class.bg-white]="theme() === 'light'" [class.shadow-sm]="theme() === 'light'" [class.hover:border-amber-200]="theme() === 'light'"
          [class.bg-[#111]]="theme() === 'dark'" [class.hover:border-amber-500/30]="theme() === 'dark'">
          <div class="p-2.5 w-fit rounded-xl bg-amber-50/50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:group-hover:bg-amber-500/20 transition-colors">
            <mat-icon class="text-[20px] w-[20px] h-[20px] sm:text-[22px] sm:w-[22px] sm:h-[22px]">lightbulb</mat-icon>
          </div>
          <span class="font-medium text-[13px] sm:text-sm leading-snug line-clamp-2 text-slate-700 dark:text-slate-200">{{ t().sugIdeasTitle }}</span>
        </button>

        <!-- Translate Card -->
        <button (click)="usePrompt.emit(t().sugTranslatePrompt)" 
          class="w-full sm:min-w-[180px] h-[110px] sm:h-[120px] flex flex-col items-start justify-between text-start p-4 rounded-2xl sm:rounded-[1.25rem] transition-all hover:-translate-y-1 hover:shadow-md group border border-transparent"
          [class.bg-white]="theme() === 'light'" [class.shadow-sm]="theme() === 'light'" [class.hover:border-purple-200]="theme() === 'light'"
          [class.bg-[#111]]="theme() === 'dark'" [class.hover:border-purple-500/30]="theme() === 'dark'">
          <div class="p-2.5 w-fit rounded-xl bg-purple-50/50 text-purple-600 group-hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:group-hover:bg-purple-500/20 transition-colors">
            <mat-icon class="text-[20px] w-[20px] h-[20px] sm:text-[22px] sm:w-[22px] sm:h-[22px]">translate</mat-icon>
          </div>
          <span class="font-medium text-[13px] sm:text-sm leading-snug line-clamp-2 text-slate-700 dark:text-slate-200">{{ t().sugTranslateTitle }}</span>
        </button>
      </div>
    </div>
  `
})
export class PromptTemplatesComponent {
  translationService = inject(TranslationService);
  
  theme = input<string>('light');
  
  t = computed(() => this.translationService.t());
  
  usePrompt = output<string>();
}
