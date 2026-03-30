import { Component, inject, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-upgrade-plans',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
      <!-- Pro Plan (Golden/Accent) -->
      <div class="relative p-8 sm:p-10 rounded-3xl border border-white/10 transition-all cursor-pointer hover:shadow-2xl bg-white/5 backdrop-blur-xl flex flex-col h-full group"
           [class.border-amber-500/50]="selectedPlan() === 'pro'"
           [class.shadow-amber-500/20]="selectedPlan() === 'pro'"
           [class.shadow-2xl]="selectedPlan() === 'pro'"
           (click)="select.emit('pro')">
        
        <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>

        @if (selectedPlan() === 'pro') {
          <div class="absolute -top-4 -right-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2 rounded-full shadow-lg shadow-amber-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        }

        <div class="mb-8 relative z-10">
          <h3 class="text-2xl font-bold text-amber-400 mb-2 drop-shadow-md">{{ pricing().pro?.name || t().enginePro }}</h3>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold text-white">{{ pricing().pro?.[billingCycle()]?.usd || 0 }}{{ t().currencyUSD }}</span>
            <span class="text-lg text-white/60">/ {{ billingCycle() === 'monthly' ? t().monthly : t().yearly }}</span>
          </div>
          <p class="text-sm text-white/50 mt-1">
            {{ t().or }} {{ pricing().pro?.[billingCycle()]?.syp || 0 }} {{ t().currencySYP }}
          </p>
        </div>

        <ul class="space-y-5 mb-10 flex-1 relative z-10">
          @if (pricing().pro?.features && pricing().pro.features.length > 0) {
            @for (feature of pricing().pro.features; track feature) {
              <li class="flex items-start gap-3 text-white/80">
                <svg class="w-6 h-6 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span class="text-lg">{{ feature }}</span>
              </li>
            }
          } @else {
            <li class="flex items-start gap-3 text-white/80">
              <svg class="w-6 h-6 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().proFeature1 }}</span>
            </li>
            <li class="flex items-start gap-3 text-white/80">
              <svg class="w-6 h-6 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().proFeature2 }}</span>
            </li>
            <li class="flex items-start gap-3 text-white/80">
              <svg class="w-6 h-6 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().proFeature3 }}</span>
            </li>
          }
        </ul>

        <button class="w-full py-4 rounded-xl font-bold text-lg transition-all relative z-10 border"
                [class.bg-gradient-to-r]="selectedPlan() === 'pro'"
                [class.from-amber-400]="selectedPlan() === 'pro'"
                [class.to-orange-500]="selectedPlan() === 'pro'"
                [class.text-white]="selectedPlan() === 'pro'"
                [class.border-transparent]="selectedPlan() === 'pro'"
                [class.bg-white/5]="selectedPlan() !== 'pro'"
                [class.text-white]="selectedPlan() !== 'pro'"
                [class.border-white/10]="selectedPlan() !== 'pro'"
                [class.hover:bg-white/10]="selectedPlan() !== 'pro'">
          {{ selectedPlan() === 'pro' ? t().continueWithPlan : t().selectPlan }}
        </button>
      </div>

      <!-- Premium Plan (Deep Blue/Purple) -->
      <div class="relative p-8 sm:p-10 rounded-3xl border border-white/10 transition-all cursor-pointer hover:shadow-2xl bg-white/5 backdrop-blur-xl flex flex-col h-full group"
           [class.border-blue-500/50]="selectedPlan() === 'premium'"
           [class.shadow-blue-500/20]="selectedPlan() === 'premium'"
           [class.shadow-2xl]="selectedPlan() === 'premium'"
           (click)="select.emit('premium')">
        
        <div class="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 whitespace-nowrap border border-white/20">
          {{ t().mostPopular || 'Most Popular' }}
        </div>

        @if (selectedPlan() === 'premium') {
          <div class="absolute -top-4 -right-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-full shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        }

        <div class="mb-8 mt-2 relative z-10">
          <h3 class="text-2xl font-bold text-blue-400 mb-2 drop-shadow-md">{{ pricing().premium?.name || t().upgradePremiumLabel }}</h3>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold text-white">{{ pricing().premium?.[billingCycle()]?.usd || 0 }}{{ t().currencyUSD }}</span>
            <span class="text-lg text-white/60">/ {{ billingCycle() === 'monthly' ? t().monthly : t().yearly }}</span>
          </div>
          <p class="text-sm text-white/50 mt-1">
            {{ t().or }} {{ pricing().premium?.[billingCycle()]?.syp || 0 }} {{ t().currencySYP }}
          </p>
        </div>

        <ul class="space-y-5 mb-10 flex-1 relative z-10">
          @if (pricing().premium?.features && pricing().premium.features.length > 0) {
            @for (feature of pricing().premium.features; track feature) {
              <li class="flex items-start gap-3 text-white/80 font-medium">
                <svg class="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span class="text-lg">{{ feature }}</span>
              </li>
            }
          } @else {
            <li class="flex items-start gap-3 text-white/80 font-medium">
              <svg class="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().premiumFeature1 }}</span>
            </li>
            <li class="flex items-start gap-3 text-white/80 font-medium">
              <svg class="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().premiumFeature2 }}</span>
            </li>
            <li class="flex items-start gap-3 text-white/80 font-medium">
              <svg class="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span class="text-lg">{{ t().premiumFeature3 }}</span>
            </li>
          }
        </ul>

        <button class="w-full py-4 rounded-xl font-bold text-lg transition-all relative z-10 border"
                [class.bg-gradient-to-r]="selectedPlan() === 'premium'"
                [class.from-blue-600]="selectedPlan() === 'premium'"
                [class.to-indigo-600]="selectedPlan() === 'premium'"
                [class.text-white]="selectedPlan() === 'premium'"
                [class.border-transparent]="selectedPlan() === 'premium'"
                [class.bg-white/5]="selectedPlan() !== 'premium'"
                [class.text-white]="selectedPlan() !== 'premium'"
                [class.border-white/10]="selectedPlan() !== 'premium'"
                [class.hover:bg-white/10]="selectedPlan() !== 'premium'">
          {{ selectedPlan() === 'premium' ? t().continueWithPlan : t().selectPlan }}
        </button>
      </div>
    </div>
  `
})
export class UpgradePlansComponent {
  private translationService = inject(TranslationService);
  t = this.translationService.t;
  
  selectedPlan = input<'pro' | 'premium' | null>(null);
  pricing = input<any>();
  billingCycle = input<'monthly' | 'yearly'>('monthly');
  select = output<'pro' | 'premium'>();
}
