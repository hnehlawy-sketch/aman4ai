import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-upgrade-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4 dark:text-white">
      <h3 class="font-bold">{{ t().paymentInstructions }}</h3>
      <p class="text-sm opacity-70">{{ t().paymentStep1 }}</p>
      
      <div class="space-y-2">
        <label class="text-sm font-medium opacity-70">{{ t().transactionId }}</label>
        <input type="text" [(ngModel)]="transactionId" [placeholder]="t().transactionIdPlaceholder" class="w-full p-2 rounded border bg-transparent dark:border-slate-700">
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium opacity-70">{{ t().attachReceipt }}</label>
        <input type="file" (change)="onFileChange($event)" class="w-full text-sm">
      </div>

      <button (click)="submit.emit({transactionId, receiptFile})" class="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors">
        {{ t().submitPayment }}
      </button>
    </div>
  `
})
export class UpgradePaymentComponent {
  plan = input<'pro' | 'premium' | null>(null);
  translationService = inject(TranslationService);
  t = computed(() => this.translationService.t());
  transactionId = '';
  receiptFile: File | null = null;
  submit = output<{transactionId: string, receiptFile: File | null}>();

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.receiptFile = file;
    }
  }
}
