import { Component, inject, output, signal, OnInit, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';
import { AuthService } from '../services/auth.service';
import { UpgradePlansComponent } from './upgrade-plans.component';
import { UpgradePaymentComponent } from './upgrade-payment.component';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, UpgradePlansComponent, UpgradePaymentComponent],
  templateUrl: './upgrade-modal.component.html'
})
export class UpgradeModalComponent implements OnInit {
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  authService = inject(AuthService);
  t = computed(() => this.translationService.t());

  close = output<void>();
  plan = input<'pro' | 'premium' | null>(null);

  selectedPlanForPayment = signal<'pro' | 'premium' | null>(null);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  isSubmitting = signal(false);
  paymentSubmitted = signal(false);

  pricing = signal<any>({
    pro: { monthly: { usd: 5, syp: 75000 }, yearly: { usd: 50, syp: 750000 } },
    premium: { monthly: { usd: 10, syp: 150000 }, yearly: { usd: 100, syp: 1500000 } }
  });

  paymentMethods = signal<any[]>([]);

  ngOnInit() {
    this.loadData();
    if (this.plan()) {
      this.selectedPlanForPayment.set(this.plan());
    }
  }

  async loadData() {
    try {
      const p = await this.authService.getPricing();
      if (p) this.pricing.set(p);

      const methods = await this.authService.getPaymentMethods();
      if (methods.length === 0) {
        this.paymentMethods.set([{
          id: 'fallback',
          name: this.translationService.t().fallbackPaymentMethod,
          accountNumber: this.translationService.t().fallbackAccountNumber,
          icon: 'account_balance_wallet'
        }]);
      } else {
        this.paymentMethods.set(methods.map((m: any) => ({
          ...m,
          accountNumber: m.details || m.accountNumber // Map details to accountNumber if needed
        })));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }

  selectPlan(plan: 'pro' | 'premium') {
    this.selectedPlanForPayment.set(plan);
    this.paymentSubmitted.set(false);
  }

  async onPaymentSubmit(data: {transactionId: string, receiptFile: File | null}) {
    if (!this.selectedPlanForPayment()) return;
    this.isSubmitting.set(true);
    try {
      let receiptUrl = '';
      if (data.receiptFile) {
        const user = this.authService.user();
        if (user) {
          receiptUrl = await this.authService.uploadPaymentReceipt(user.uid, data.receiptFile);
        }
      }
      
      const planDetails = `${this.selectedPlanForPayment()} - ${this.billingCycle()}`;
      await this.authService.submitPaymentRequest(data.transactionId, receiptUrl, planDetails);
      this.paymentSubmitted.set(true);
    } catch (e) {
      console.error('Payment submission failed', e);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeModal() {
    this.close.emit();
  }
}
