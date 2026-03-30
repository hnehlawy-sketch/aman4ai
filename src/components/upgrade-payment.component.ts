import { Component, inject, output, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../services/translation.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-upgrade-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <div class="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
        <h4 class="text-lg font-bold text-blue-300 mb-2">{{ t().paymentInstructions }}</h4>
        <p class="text-base text-indigo-200 leading-relaxed">{{ t().paymentStep1 }}</p>
      </div>

      <!-- Payment Methods Selection -->
      <div class="flex flex-wrap gap-4 justify-center">
        @for (method of methods(); track method.id) {
          <button (click)="selectedMethod.set(method)"
                  class="px-6 py-3 rounded-xl border transition-all flex items-center gap-3 font-bold"
                  [class.bg-blue-600]="selectedMethod()?.id === method.id"
                  [class.border-blue-400]="selectedMethod()?.id === method.id"
                  [class.text-white]="selectedMethod()?.id === method.id"
                  [class.shadow-lg]="selectedMethod()?.id === method.id"
                  [class.shadow-blue-500/30]="selectedMethod()?.id === method.id"
                  [class.bg-white/5]="selectedMethod()?.id !== method.id"
                  [class.border-white/10]="selectedMethod()?.id !== method.id"
                  [class.text-white/70]="selectedMethod()?.id !== method.id"
                  [class.hover:bg-white/10]="selectedMethod()?.id !== method.id"
                  [class.hover:text-white]="selectedMethod()?.id !== method.id">
            @if (method.iconUrl) {
              <img [src]="method.iconUrl" class="w-6 h-6 object-contain">
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
              </svg>
            }
            {{ method.name }}
          </button>
        }
      </div>

      <!-- Central QR Code Area -->
      @if (selectedMethod()) {
        <div class="max-w-md mx-auto p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
          <h3 class="text-2xl font-bold text-white mb-6">{{ selectedMethod()?.name }}</h3>
          
          <div class="p-6 bg-black/30 rounded-2xl border border-white/5 w-full mb-8">
            <p class="text-sm text-indigo-300 uppercase tracking-widest font-bold mb-2">{{ t().paymentInstructions }}</p>
            <p class="text-3xl font-mono font-bold text-blue-400 tracking-wider select-all">{{ selectedMethod()?.accountNumber }}</p>
          </div>
          
          @if (qrCodes()[selectedMethod()!.id] || selectedMethod()?.qrCodeUrl) {
            <div class="flex flex-col items-center gap-4">
              <p class="text-sm uppercase tracking-widest text-indigo-300 font-bold">{{ t().scanBarcodeToPay }}</p>
              <div class="p-4 bg-white rounded-2xl shadow-xl border border-white/20">
                <img [src]="qrCodes()[selectedMethod()!.id] || selectedMethod()?.qrCodeUrl" class="w-48 h-48 object-contain">
              </div>
            </div>
          }
        </div>
      }

      <!-- Transaction Submission -->
      <div class="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl mt-8">
        <h3 class="text-xl font-bold text-white mb-6">{{ t().submitPayment }}</h3>
        
        <div class="space-y-6">
          <div>
            <label class="block text-base font-medium text-indigo-200 mb-2">{{ t().transactionId }}</label>
            <input type="text" [(ngModel)]="transactionId" 
                   [placeholder]="t().transactionIdPlaceholder"
                   class="w-full px-5 py-4 rounded-xl border border-white/20 bg-black/20 text-white placeholder-white/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-lg">
          </div>

          <div>
            <label class="block text-base font-medium text-indigo-200 mb-2">{{ t().attachReceipt }}</label>
            <div class="relative group cursor-pointer" (click)="fileInput.click()">
              <div class="w-full h-48 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 group-hover:border-blue-400 group-hover:bg-blue-900/20 transition-all bg-black/20">
                @if (receiptPreview()) {
                  <img [src]="receiptPreview()" class="h-full w-full object-contain rounded-xl p-2">
                } @else {
                  <div class="w-16 h-16 bg-white/10 rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8 text-blue-400">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6.75a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v12.75a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-indigo-300">{{ t().uploadReceiptHint }}</span>
                }
              </div>
              <input #fileInput type="file" class="hidden" accept="image/*" (change)="onFileSelected($event)">
            </div>
          </div>

          <button (click)="submit()" [disabled]="!transactionId || isSubmitting()"
                  class="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold transition-all shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-3 mt-4 border border-white/10">
            @if (isSubmitting()) {
              <svg class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
            {{ t().submitPayment }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class UpgradePaymentComponent {
  private translationService = inject(TranslationService);
  t = this.translationService.t;
  
  methods = input<any[]>([]);
  isSubmitting = input<boolean>(false);
  paymentSubmit = output<{transactionId: string, receiptFile: File | null}>();

  selectedMethod = signal<any | null>(null);
  transactionId = '';
  receiptFile: File | null = null;
  receiptPreview = signal<string | null>(null);
  qrCodes = signal<{[key: string]: string}>({});

  constructor() {
    effect(() => {
      const methods = this.methods();
      if (methods && methods.length > 0) {
        this.generateQRCodes(methods);
        if (!this.selectedMethod()) {
          this.selectedMethod.set(methods[0]);
        }
      }
    }, { allowSignalWrites: true });
  }

  async generateQRCodes(methods: any[]) {
    const codes: {[key: string]: string} = {};
    for (const method of methods) {
      if (!method.qrCodeUrl && method.accountNumber) {
        try {
          const url = await QRCode.toDataURL(method.accountNumber, {
            margin: 1,
            width: 256,
            color: {
              dark: '#2563eb', // blue-600
              light: '#ffffff'
            }
          });
          codes[method.id] = url;
        } catch (e) {
          console.error('Failed to generate QR code', e);
        }
      }
    }
    this.qrCodes.set(codes);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.receiptFile = file;
      const reader = new FileReader();
      reader.onload = (e) => this.receiptPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  submit() {
    this.paymentSubmit.emit({
      transactionId: this.transactionId,
      receiptFile: this.receiptFile
    });
  }
}
