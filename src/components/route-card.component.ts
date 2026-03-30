import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-route-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4 mb-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-slide-up max-w-sm group/card">
      <div class="h-56 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
        <iframe 
          [src]="getRouteUrl(route().origin.lat, route().origin.lng, route().destination.lat, route().destination.lng)"
          width="100%" 
          height="100%" 
          style="border:0;" 
          allowfullscreen="" 
          loading="lazy" 
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>
      <div class="p-5">
        <div class="flex items-center gap-4 mb-5">
          <div class="flex-1">
            <p class="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-1">{{ translationService.t().route }}</p>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate" [title]="route().origin.label">{{ translationService.t().from }}: {{ route().origin.label }}</h3>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate" [title]="route().destination.label">{{ translationService.t().to }}: {{ route().destination.label }}</h3>
            <div class="flex items-center gap-3 mt-2">
              @if (route().distance) {
                <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ route().distance }}</p>
              }
              @if (route().duration) {
                <span class="text-slate-300 dark:text-slate-600">|</span>
                <p class="text-xs font-bold text-green-600 dark:text-green-400">{{ route().duration }}</p>
              }
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button (click)="openRouteInMaps(route().origin.lat, route().origin.lng, route().destination.lat, route().destination.lng)" class="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {{ translationService.t().openInMaps }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class RouteCardComponent {
  route = input.required<any>();
  translationService = inject(TranslationService);
  private sanitizer = inject(DomSanitizer);

  getRouteUrl(olat: number, olng: number, dlat: number, dlng: number): SafeResourceUrl {
    const url = `https://www.google.com/maps/embed/v1/directions?key=YOUR_GOOGLE_MAPS_API_KEY&origin=${olat},${olng}&destination=${dlat},${dlng}&mode=driving`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openRouteInMaps(olat: number, olng: number, dlat: number, dlng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${olat},${olng}&destination=${dlat},${dlng}&travelmode=driving`;
    window.open(url, '_blank');
  }
}
