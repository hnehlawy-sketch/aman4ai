import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-upgrade-plans',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Pro Plan -->
      <div class="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all cursor-pointer bg-white dark:bg-slate-800" (click)="select.emit('pro')">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <mat-icon class="text-blue-600 dark:text-blue-400">star</mat-icon>
          </div>
          <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">Pro</span>
        </div>
        <h3 class="text-xl font-bold mb-2">{{ t().upgradePro }}</h3>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">{{ t().proPrice }}</p>
        <ul class="space-y-3 mb-6">
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().proFeature1 }}
          </li>
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().proFeature2 }}
          </li>
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().proFeature3 }}
          </li>
        </ul>
        <button class="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded-xl font-medium transition-all">
          {{ t().subscribePro }}
        </button>
      </div>

      <!-- Premium Plan -->
      <div class="p-6 rounded-2xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 relative overflow-hidden" (click)="select.emit('premium')">
        <div class="absolute top-0 right-0 p-2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest transform rotate-45 translate-x-4 -translate-y-1 w-24 text-center">Best</div>
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 bg-blue-500 rounded-xl">
            <mat-icon class="text-white">workspace_premium</mat-icon>
          </div>
          <span class="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">Premium</span>
        </div>
        <h3 class="text-xl font-bold mb-2">{{ t().upgradePremiumLabel }}</h3>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">{{ t().premiumPrice }}</p>
        <ul class="space-y-3 mb-6">
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().premiumFeature1 }}
          </li>
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().premiumFeature2 }}
          </li>
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().premiumFeature3 }}
          </li>
          <li class="flex items-center gap-2 text-sm">
            <mat-icon class="!w-4 !h-4 !text-[16px] text-green-500">check_circle</mat-icon>
            {{ t().premiumFeature4 }}
          </li>
        </ul>
        <button class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all">
          {{ t().subscribePremium }}
        </button>
      </div>
    </div>
  `
})
export class UpgradePlansComponent {
  translationService = inject(TranslationService);
  t = this.translationService.t;
  
  billingCycle = input.required<'monthly' | 'yearly'>();
  pricing = input.required<any>();
  selectedPlan = input<string | null>(null);
  
  select = output<'pro' | 'premium'>();
}
