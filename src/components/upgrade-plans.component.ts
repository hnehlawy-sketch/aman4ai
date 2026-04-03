import { Component, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-upgrade-plans',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <div class="p-4 border dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors dark:text-white" (click)="selectPlan.emit('pro')">
        <h3 class="font-bold">Pro</h3>
        <p class="text-sm opacity-70">{{ t().proPrice }}</p>
      </div>
      <div class="p-4 border dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors dark:text-white" (click)="selectPlan.emit('premium')">
        <h3 class="font-bold">Premium</h3>
        <p class="text-sm opacity-70">{{ t().premiumPrice }}</p>
      </div>
    </div>
  `
})
export class UpgradePlansComponent {
  translationService = inject(TranslationService);
  t = computed(() => this.translationService.t());
  selectPlan = output<'pro' | 'premium'>();
}
