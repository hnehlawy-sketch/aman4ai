import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafePipe } from '../pipes/safe.pipe';

@Component({
  selector: 'app-live-visual-content',
  standalone: true,
  imports: [CommonModule, SafePipe],
  template: `
    @if (content()) {
      <div class="mb-6 animate-scaleIn">
        @if (content()?.type === 'image') {
          <div class="relative group max-w-fit mx-auto">
            <img [src]="content()?.data" class="max-h-[300px] rounded-2xl shadow-2xl border-2 border-white/20 mx-auto object-contain bg-black/40">
          </div>
        } @else if (content()?.type === 'map') {
          <div class="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-md">
            <iframe 
              [src]="content()?.data.url | safe:'resourceUrl'"
              width="100%" 
              height="200" 
              style="border:0;" 
              allowfullscreen="" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
            <div class="p-4 text-left">
              <h3 class="font-bold text-white truncate">{{ content()?.data.label }}</h3>
              <p class="text-xs text-white/50 font-mono mt-1">{{ content()?.data.lat.toFixed(4) }}, {{ content()?.data.lng.toFixed(4) }}</p>
            </div>
          </div>
        } @else if (content()?.type === 'route') {
          <div class="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-md">
            <iframe 
              [src]="content()?.data.url | safe:'resourceUrl'"
              width="100%" 
              height="200" 
              style="border:0;" 
              allowfullscreen="" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
            <div class="p-4 text-left flex flex-col gap-2">
              <div class="flex gap-2">
                <span class="font-bold text-blue-400">{{ content()?.data.distance }}</span>
                @if (content()?.data.duration) {
                  <span class="text-white/40">|</span>
                  <span class="font-bold text-green-400">{{ content()?.data.duration }}</span>
                }
              </div>
              <span class="opacity-70 truncate max-w-[150px]">{{ content()?.data.origin.label }} ➔ {{ content()?.data.destination.label }}</span>
            </div>
          </div>
        }
        <button (click)="close.emit()" class="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors underline">إخفاء</button>
      </div>
    }
  `
})
export class LiveVisualContentComponent {
  content = input<{ type: 'image' | 'map' | 'route', data: any } | null>(null);
  close = output<void>();
}
