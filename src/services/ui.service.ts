import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  authModalOpen = signal(false);
  settingsModalOpen = signal(false);
  exportModalOpen = signal(false);
  personalizationModalOpen = signal(false);
  liveViewOpen = signal(false);
  adminPanelOpen = signal(false);

  openAuthModal() { this.authModalOpen.set(true); }
  closeAuthModal() { this.authModalOpen.set(false); }

  openSettingsModal() { this.settingsModalOpen.set(true); }
  closeSettingsModal() { this.settingsModalOpen.set(false); }

  openExportModal() { this.exportModalOpen.set(true); }
  closeExportModal() { this.exportModalOpen.set(false); }
  
  openPersonalizationModal() { 
    this.settingsModalOpen.set(false);
    this.personalizationModalOpen.set(true); 
  }
  closePersonalizationModal() { this.personalizationModalOpen.set(false); }

  openLiveView() { this.liveViewOpen.set(true); }
  closeLiveView() { this.liveViewOpen.set(false); }

  openAdminPanel() { this.adminPanelOpen.set(true); }
  closeAdminPanel() { this.adminPanelOpen.set(false); }
}
