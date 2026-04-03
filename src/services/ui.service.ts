import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UiService {
  private authService = inject(AuthService);
  authModalOpen = signal(false);
  accountModalOpen = signal(false);
  settingsModalOpen = signal(false);
  exportModalOpen = signal(false);
  personalizationModalOpen = signal(false);
  liveViewOpen = signal(false);
  upgradeModalOpen = signal(false);
  upgradePlan = signal<'pro' | 'premium' | null>(null);
  infoModalOpen = signal(false);
  infoModalType = signal<'privacy' | 'terms' | 'about'>('privacy');
  infoModalTitle = signal('');
  imageViewOpen = signal(false);
  selectedImageUrl = signal<string | null>(null);
  
  // For triggering actions from Live Chat to Main Chat
  mainChatAction = signal<{ name: string, args: any } | null>(null);

  // Toast
  toast = signal<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  openAuthModal() { this.authModalOpen.set(true); }
  closeAuthModal() { this.authModalOpen.set(false); }

  openAccountModal() { this.accountModalOpen.set(true); }
  closeAccountModal() { this.accountModalOpen.set(false); }

  openSettingsModal() { 
    this.settingsModalOpen.set(true); 
  }
  closeSettingsModal() { 
    this.settingsModalOpen.set(false); 
  }

  openExportModal() { 
    if (!this.authService.user()) {
        this.openAuthModal();
        return;
    }
    this.exportModalOpen.set(true); 
  }
  closeExportModal() { this.exportModalOpen.set(false); }
  
  openPersonalizationModal() { 
    if (!this.authService.user()) {
        this.openAuthModal();
        return;
    }
    this.settingsModalOpen.set(false);
    this.personalizationModalOpen.set(true); 
  }
  closePersonalizationModal() { this.personalizationModalOpen.set(false); }

  openLiveView() { this.liveViewOpen.set(true); }
  closeLiveView() { this.liveViewOpen.set(false); }

  openUpgradeModal(plan: 'pro' | 'premium' | null = null) {
    if (!this.authService.user()) {
        this.openAuthModal();
        return;
    }
    this.upgradePlan.set(plan);
    this.upgradeModalOpen.set(true);
  }
  closeUpgradeModal() {
    this.upgradeModalOpen.set(false);
    this.upgradePlan.set(null);
  }

  openInfoModal(type: 'privacy' | 'terms' | 'about', title: string) {
    this.infoModalType.set(type);
    this.infoModalTitle.set(title);
    this.infoModalOpen.set(true);
  }
  closeInfoModal() { this.infoModalOpen.set(false); }

  openImageView(url: string) {
    this.selectedImageUrl.set(url);
    this.imageViewOpen.set(true);
  }
  closeImageView() {
    this.imageViewOpen.set(false);
    this.selectedImageUrl.set(null);
  }

  triggerMainChatAction(action: { name: string, args: any }) {
    this.mainChatAction.set(action);
  }
}
