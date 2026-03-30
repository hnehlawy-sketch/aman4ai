import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast(); as t) {
      <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full shadow-lg text-white text-sm font-bold flex items-center gap-2 animate-slide-up"
           [class.bg-slate-900]="t.type === 'info'"
           [class.bg-red-500]="t.type === 'error'"
           [class.bg-green-500]="t.type === 'success'">
        @if (t.type === 'success') {
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        }
        @if (t.type === 'error') {
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        }
        <span>{{ t.message }}</span>
      </div>
    }
  `
})
export class ToastComponent {
  toast = input.required<any>();
}
