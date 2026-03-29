import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-location-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4 mb-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-slide-up max-w-sm group/card">
      <!-- Real Map Iframe -->
      <div class="h-56 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
        <iframe 
          [src]="mapUrl()"
          width="100%" 
          height="100%" 
          style="border:0;" 
          allowfullscreen="" 
          loading="lazy" 
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>

      <!-- Info Section -->
      <div class="p-5">
        <div class="flex items-center gap-4 mb-5">
          <div class="flex-1">
            <p class="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-1">{{ t().currentLocation || 'الموقع الحالي' }}</p>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ location().label || 'تم تحديد موقعك بدقة' }}</h3>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
            <p class="text-[9px] uppercase text-slate-400 font-bold mb-1">{{ t().latitude || 'خط العرض' }}</p>
            <p class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{{ location().lat.toFixed(4) }}</p>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
            <p class="text-[9px] uppercase text-slate-400 font-bold mb-1">{{ t().longitude || 'خط الطول' }}</p>
            <p class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{{ location().lng.toFixed(4) }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button (click)="openInMaps(location().lat, location().lng)" class="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {{ t().openInMaps || 'فتح في الخرائط' }}
          </button>
          <button (click)="openInMaps(location().lat, location().lng, false)" class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `
})
export class LocationCardComponent {
  location = input.required<any>();
  t = input.required<any>();

  private sanitizer = inject(DomSanitizer);

  mapUrl = computed(() => {
    const loc = this.location();
    if (loc) {
      const url = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&hl=ar&z=15&output=embed`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  });

  openInMaps(lat: number, lng: number, viewOnly: boolean = false) {
    const url = viewOnly 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }
}
