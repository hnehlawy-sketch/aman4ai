import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-upgrade-payment',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <h3 class="font-bold mb-4 flex items-center gap-2">
          <mat-icon class="text-blue-600">info</mat-icon>
          {{ t().paymentInstructions }}
        </h3>
        <ol class="space-y-4 text-sm">
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <p>{{ t().paymentStep1 }}</p>
          </li>
          <div class="flex justify-center py-4">
            <div class="bg-white p-4 rounded-2xl shadow-sm">
              <img src="https://picsum.photos/seed/qr/200/200" alt="QR Code" class="w-40 h-40">
              <p class="text-center text-xs text-slate-500 mt-2">{{ t().paymentStep2 }}</p>
            </div>
          </div>
          <li class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <p>{{ t().paymentStep3 }}</p>
          </li>
        </ol>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t().transactionId }}</label>
          <input type="text" [ngModel]="transactionId()" (ngModelChange)="transactionId.set($event)" [placeholder]="t().transactionIdPlaceholder" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t().uploadReceipt }}</label>
          <input type="file" (change)="onFileSelected($event)" accept="image/*" class="w-full p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm">
        </div>

        <button (click)="onSubmit()" [disabled]="!transactionId() || isSubmitting()" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50">
          {{ isSubmitting() ? t().processing : t().submitPayment }}
        </button>
      </div>
    </div>
  `
})
export class UpgradePaymentComponent {
  translationService = inject(TranslationService);
  t = this.translationService.t;
  
  plan = input.required<'pro' | 'premium'>();
  cycle = input.required<'monthly' | 'yearly'>();
  price = input.required<any>();
  paymentMethods = input.required<any[]>();
  isSubmitting = input<boolean>(false);
  submit = output<{transactionId: string, receiptFile: File | null}>();

  transactionId = signal('');
  selectedFile: File | null = null;

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onSubmit() {
    if (this.transactionId()) {
      this.submit.emit({
        transactionId: this.transactionId(),
        receiptFile: this.selectedFile
      });
    }
  }
}
