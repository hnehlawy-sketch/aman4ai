import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { ImageService } from '../services/image.service';

@Component({
  selector: 'app-image-view-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-300"
         (click)="close()">
      
      <!-- Close Button -->
      <button class="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-50"
              (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Image Container -->
      <div class="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center p-4" (click)="$event.stopPropagation()">
        <img [src]="uiService.selectedImageUrl()" 
             class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
             alt="Full Screen Image">
             
        <!-- Actions (Download) -->
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
           <button (click)="download()" 
              class="flex items-center gap-2 px-6 py-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg hover:scale-105 active:scale-95">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
               <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" transform="rotate(-90 12 12)" />
             </svg>
             <span class="font-medium">Download</span>
           </button>
        </div>
      </div>
    </div>
  `
})
export class ImageViewModalComponent {
  uiService = inject(UiService);
  imageService = inject(ImageService);

  close() {
    this.uiService.closeImageView();
  }

  download() {
    const url = this.uiService.selectedImageUrl();
    if (url) {
      this.imageService.downloadImageWithWatermark(url, `aman-ai-image-${Date.now()}.png`);
    }
  }
}
