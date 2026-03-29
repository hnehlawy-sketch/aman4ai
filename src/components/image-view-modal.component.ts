import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { ImageService } from '../services/image.service';
import { TranslationService } from '../services/translation.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-image-view-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-300"
         (click)="close()">
      
      <!-- Close Button -->
      <button class="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md z-50"
              (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Image Container -->
      <div class="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center p-4" (click)="$event.stopPropagation()">
        <img [src]="uiService.selectedImageUrl()" 
             class="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
             alt="Full Screen Image">
             
        <!-- Actions (Download & Share) -->
        <div class="mt-8 flex gap-4">
           <button (click)="download()" [disabled]="isLoading()"
              class="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
             @if (isLoading()) {
               <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             } @else {
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
               </svg>
             }
             <span class="font-semibold tracking-wide">{{ translationService.t().download }}</span>
           </button>
 
           <button (click)="share()" [disabled]="isLoading()"
              class="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
             @if (isLoading()) {
               <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             } @else {
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75M12 18.75L15.75 15M12 18.75V5.25" />
                 <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9H18.75C19.9926 9 21 10.0074 21 11.25V18.75C21 19.9926 19.9926 21 18.75 21H5.25C4.00736 21 3 19.9926 3 18.75V11.25C3 10.0074 4.00736 9 5.25 9H8.25" />
               </svg>
             }
             <span class="font-semibold tracking-wide">{{ translationService.t().share }}</span>
           </button>
        </div>
      </div>
    </div>
  `
})
export class ImageViewModalComponent {
  uiService = inject(UiService);
  imageService = inject(ImageService);
  translationService = inject(TranslationService);
  themeService = inject(ThemeService);
  isLoading = signal(false);

  close() {
    this.uiService.closeImageView();
  }

  async download() {
    const url = this.uiService.selectedImageUrl();
    if (url && !this.isLoading()) {
      this.isLoading.set(true);
      await this.imageService.downloadImageWithWatermark(url, `aman-ai-image-${Date.now()}.png`);
      this.isLoading.set(false);
    }
  }

  async share() {
    const url = this.uiService.selectedImageUrl();
    if (url && !this.isLoading()) {
      this.isLoading.set(true);
      await this.imageService.shareImage(url, 'Aman AI Generated Image');
      this.isLoading.set(false);
    }
  }
}
