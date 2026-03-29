import { Component, input, output, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-prompt-templates',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="w-full max-w-4xl mx-auto px-4 pb-4">
      <!-- Prompt Templates Row -->
      <div class="grid grid-cols-2 sm:flex sm:flex-row sm:flex-nowrap gap-3 sm:gap-4 justify-center">
        
        <!-- Email Card -->
        <button (click)="usePrompt.emit(t().sugEmailPrompt)" 
          class="h-[100px] sm:h-[130px] sm:min-w-[180px] flex flex-col items-start justify-between text-start p-3 sm:p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md group"
          [class.bg-white]="theme() === 'light'" [class.border-gray-200]="theme() === 'light'" [class.hover:border-blue-300]="theme() === 'light'"
          [class.bg-slate-800]="theme() === 'dark'" [class.border-slate-700]="theme() === 'dark'" [class.hover:border-blue-500/50]="theme() === 'dark'">
          <div class="p-2 w-fit rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <mat-icon class="text-xl sm:text-2xl">mail</mat-icon>
          </div>
          <span class="font-bold text-sm leading-tight line-clamp-2">{{ t().sugEmailTitle }}</span>
        </button>

        <!-- Summary Card -->
        <button (click)="usePrompt.emit(t().sugSummaryPrompt)" 
          class="h-[100px] sm:h-[130px] sm:min-w-[180px] flex flex-col items-start justify-between text-start p-3 sm:p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md group"
          [class.bg-white]="theme() === 'light'" [class.border-gray-200]="theme() === 'light'" [class.hover:border-green-300]="theme() === 'light'"
          [class.bg-slate-800]="theme() === 'dark'" [class.border-slate-700]="theme() === 'dark'" [class.hover:border-green-500/50]="theme() === 'dark'">
          <div class="p-2 w-fit rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <mat-icon class="text-xl sm:text-2xl">auto_stories</mat-icon>
          </div>
          <span class="font-bold text-sm leading-tight line-clamp-2">{{ t().sugSummaryTitle }}</span>
        </button>

        <!-- Ideas Card -->
        <button (click)="usePrompt.emit(t().sugIdeasPrompt)" 
          class="h-[100px] sm:h-[130px] sm:min-w-[180px] flex flex-col items-start justify-between text-start p-3 sm:p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md group"
          [class.bg-white]="theme() === 'light'" [class.border-gray-200]="theme() === 'light'" [class.hover:border-purple-300]="theme() === 'light'"
          [class.bg-slate-800]="theme() === 'dark'" [class.border-slate-700]="theme() === 'dark'" [class.hover:border-purple-500/50]="theme() === 'dark'">
          <div class="p-2 w-fit rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <mat-icon class="text-xl sm:text-2xl">lightbulb</mat-icon>
          </div>
          <span class="font-bold text-sm leading-tight line-clamp-2">{{ t().sugIdeasTitle }}</span>
        </button>

        <!-- Translate Card -->
        <button (click)="usePrompt.emit(t().sugTranslatePrompt)" 
          class="h-[100px] sm:h-[130px] sm:min-w-[180px] flex flex-col items-start justify-between text-start p-3 sm:p-4 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md group"
          [class.bg-white]="theme() === 'light'" [class.border-gray-200]="theme() === 'light'" [class.hover:border-indigo-300]="theme() === 'light'"
          [class.bg-slate-800]="theme() === 'dark'" [class.border-slate-700]="theme() === 'dark'" [class.hover:border-indigo-500/50]="theme() === 'dark'">
          <div class="p-2 w-fit rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <mat-icon class="text-xl sm:text-2xl">translate</mat-icon>
          </div>
          <span class="font-bold text-sm leading-tight line-clamp-2">{{ t().sugTranslateTitle }}</span>
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
